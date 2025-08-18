use std::fs;
use std::path::PathBuf;
use tauri::command;
use chrono::{Utc, NaiveTime, Timelike};

use crate::models::*;
use crate::config::{get_config_dir, load_config, save_config};

#[command]
pub async fn schedule_backup(profile_id: String, schedule: Schedule) -> Result<(), String> {
    let mut config = load_config().await?;
    
    if let Some(profile) = config.profiles.iter_mut().find(|p| p.id == profile_id) {
        profile.schedule = Some(schedule.clone());
        profile.updated_at = Utc::now();
        
        // Create the actual OS schedule
        create_os_schedule(profile, &schedule).await?;
        
        config.updated_at = Utc::now();
        save_config(&config).await?;
        Ok(())
    } else {
        Err("Profile not found".to_string())
    }
}

#[command]
pub async fn unschedule_backup(profile_id: String) -> Result<(), String> {
    let mut config = load_config().await?;
    
    if let Some(profile) = config.profiles.iter_mut().find(|p| p.id == profile_id) {
        // Remove the OS schedule
        remove_os_schedule(profile).await?;
        
        profile.schedule = None;
        profile.updated_at = Utc::now();
        
        config.updated_at = Utc::now();
        save_config(&config).await?;
        Ok(())
    } else {
        Err("Profile not found".to_string())
    }
}

#[command]
pub async fn get_schedule_status(profile_id: String) -> Result<Option<Schedule>, String> {
    let config = load_config().await?;
    
    if let Some(profile) = config.profiles.iter().find(|p| p.id == profile_id) {
        Ok(profile.schedule.clone())
    } else {
        Err("Profile not found".to_string())
    }
}

async fn create_os_schedule(profile: &Profile, schedule: &Schedule) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let scripts_dir = config_dir.join("scripts");
    fs::create_dir_all(&scripts_dir).map_err(|e| e.to_string())?;

    // Create runner script
    let runner_script = create_runner_script(profile, &scripts_dir).await?;

    #[cfg(target_os = "macos")]
    {
        create_launchd_schedule(profile, schedule, &runner_script).await?;
    }

    #[cfg(target_os = "windows")]
    {
        create_windows_schedule(profile, schedule, &runner_script).await?;
    }

    #[cfg(target_os = "linux")]
    {
        create_systemd_schedule(profile, schedule, &runner_script).await?;
    }

    Ok(())
}

async fn create_runner_script(profile: &Profile, scripts_dir: &PathBuf) -> Result<PathBuf, String> {
    let script_name = format!("backup-{}.sh", profile.id);
    let script_path = scripts_dir.join(&script_name);
    
    let destination = profile.destination();
    let sources = profile.sources.join(" ");
    let flags = profile.rclone_flags.join(" ");
    
    let operation = match profile.mode {
        BackupMode::Copy => "copy",
        BackupMode::Sync => "sync",
    };

    let script_content = format!(
        r#"#!/bin/bash
set -euo pipefail

# Cloud Backup App - Auto Backup Script
# Profile: {}
# Generated: {}

RCLONE_BIN="{}"
RCLONE_CONFIG="{}"
DESTINATION="{}"
OPERATION="{}"
FLAGS="{}"

# Log file
LOG_FILE="$HOME/.config/cloud-backup-app/logs/backup-{}.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "$(date): Starting backup for profile {}" >> "$LOG_FILE"

# Backup each source
{}

echo "$(date): Backup completed for profile {}" >> "$LOG_FILE"
"#,
        profile.name,
        Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
        profile.rclone_bin,
        profile.rclone_conf,
        destination,
        operation,
        flags,
        profile.id,
        profile.name,
        generate_backup_commands(&profile.sources, &destination, operation, &flags),
        profile.name
    );

    fs::write(&script_path, script_content).map_err(|e| e.to_string())?;

    // Make script executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&script_path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&script_path, perms).map_err(|e| e.to_string())?;
    }

    Ok(script_path)
}

fn generate_backup_commands(sources: &[String], destination: &str, operation: &str, flags: &str) -> String {
    sources.iter()
        .map(|source| format!(
            r#"echo "$(date): Backing up {}" >> "$LOG_FILE"
"$RCLONE_BIN" {} "{}" "{}" --config "$RCLONE_CONFIG" {} --log-file "$LOG_FILE" --log-level INFO"#,
            source, operation, source, destination, flags
        ))
        .collect::<Vec<_>>()
        .join("\n\n")
}

#[cfg(target_os = "macos")]
async fn create_launchd_schedule(profile: &Profile, schedule: &Schedule, runner_script: &PathBuf) -> Result<(), String> {
    let plist_name = format!("com.cloudbackup.backup-{}.plist", profile.id);
    let plist_path = dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join("Library/LaunchAgents")
        .join(&plist_name);

    fs::create_dir_all(plist_path.parent().unwrap()).map_err(|e| e.to_string())?;

    let time = NaiveTime::parse_from_str(&schedule.time, "%H:%M")
        .map_err(|_| "Invalid time format")?;

    let calendar_interval = match schedule.frequency {
        ScheduleFrequency::Daily => format!(
            "<dict><key>Hour</key><integer>{}</integer><key>Minute</key><integer>{}</integer></dict>",
            time.hour(), time.minute()
        ),
        ScheduleFrequency::Weekly(day) => format!(
            "<dict><key>Weekday</key><integer>{}</integer><key>Hour</key><integer>{}</integer><key>Minute</key><integer>{}</integer></dict>",
            day, time.hour(), time.minute()
        ),
        ScheduleFrequency::Monthly(day) => format!(
            "<dict><key>Day</key><integer>{}</integer><key>Hour</key><integer>{}</integer><key>Minute</key><integer>{}</integer></dict>",
            day, time.hour(), time.minute()
        ),
    };

    let plist_content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudbackup.backup-{}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
    </array>
    <key>StartCalendarInterval</key>
    {}
    <key>WorkingDirectory</key>
    <string>{}</string>
    <key>StandardOutPath</key>
    <string>{}/logs/backup-{}.out</string>
    <key>StandardErrorPath</key>
    <string>{}/logs/backup-{}.err</string>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>"#,
        profile.id,
        runner_script.display(),
        calendar_interval,
        get_config_dir()?.display(),
        get_config_dir()?.display(),
        profile.id,
        get_config_dir()?.display(),
        profile.id
    );

    fs::write(&plist_path, plist_content).map_err(|e| e.to_string())?;

    // Load the launch agent
    let output = tokio::process::Command::new("launchctl")
        .args(&["load", "-w", &plist_path.to_string_lossy()])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!("Failed to load launch agent: {}", String::from_utf8_lossy(&output.stderr)));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
async fn create_windows_schedule(_profile: &Profile, _schedule: &Schedule, _runner_script: &PathBuf) -> Result<(), String> {
    // Windows Task Scheduler implementation would go here
    // Using schtasks command or Windows API
    Err("Windows scheduling not implemented yet".to_string())
}

#[cfg(target_os = "linux")]
async fn create_systemd_schedule(_profile: &Profile, _schedule: &Schedule, _runner_script: &PathBuf) -> Result<(), String> {
    // Systemd user timer implementation would go here
    Err("Linux systemd scheduling not implemented yet".to_string())
}

async fn remove_os_schedule(profile: &Profile) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let plist_name = format!("com.cloudbackup.backup-{}.plist", profile.id);
        let plist_path = dirs::home_dir()
            .ok_or("Could not determine home directory")?
            .join("Library/LaunchAgents")
            .join(&plist_name);

        if plist_path.exists() {
            // Unload the launch agent
            let _ = tokio::process::Command::new("launchctl")
                .args(&["unload", "-w", &plist_path.to_string_lossy()])
                .output()
                .await;

            // Remove the plist file
            fs::remove_file(plist_path).map_err(|e| e.to_string())?;
        }
    }

    // Remove the runner script
    let config_dir = get_config_dir()?;
    let script_path = config_dir.join("scripts").join(format!("backup-{}.sh", profile.id));
    if script_path.exists() {
        fs::remove_file(script_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}