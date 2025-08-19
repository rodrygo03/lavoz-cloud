use std::fs;
use std::path::PathBuf;
use tauri::command;
use chrono::{Utc, Local, NaiveTime, NaiveDate, DateTime, Timelike, Datelike, Duration, TimeZone};

use crate::models::*;
use crate::config::{get_config_dir, load_config, save_config};

#[command]
pub async fn schedule_backup(profile_id: String, mut schedule: Schedule) -> Result<(), String> {
    let mut config = load_config().await?;
    
    if let Some(profile) = config.profiles.iter_mut().find(|p| p.id == profile_id) {
        // Use simple local time calculation for next_run (for display only)
        // The actual scheduling uses the time field directly
        let time = NaiveTime::parse_from_str(&schedule.time, "%H:%M")
            .map_err(|_| "Invalid time format")?;
        let now_local = Local::now();
        let today_local = now_local.date_naive();
        let today_at_time = today_local.and_time(time);
        let today_local_dt = Local.from_local_datetime(&today_at_time).single()
            .ok_or("Invalid local time")?;
        
        if today_local_dt > now_local {
            schedule.next_run = Some(today_local_dt.with_timezone(&Utc));
        } else {
            let tomorrow_local = today_local + Duration::days(1);
            let tomorrow_at_time = tomorrow_local.and_time(time);
            let tomorrow_local_dt = Local.from_local_datetime(&tomorrow_at_time).single()
                .ok_or("Invalid local time")?;
            schedule.next_run = Some(tomorrow_local_dt.with_timezone(&Utc));
        }
        
        profile.schedule = Some(schedule.clone());
        profile.updated_at = Utc::now();
        
        // Create the actual OS schedule using simplified approach
        create_simple_os_schedule(profile, &schedule).await?;
        
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

async fn create_simple_os_schedule(profile: &Profile, schedule: &Schedule) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let scripts_dir = config_dir.join("scripts");
    fs::create_dir_all(&scripts_dir).map_err(|e| e.to_string())?;

    // Create runner script
    let runner_script = create_runner_script(profile, &scripts_dir).await?;

    #[cfg(target_os = "macos")]
    {
        create_simple_launchd_schedule(profile, schedule, &runner_script).await?;
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
async fn create_simple_launchd_schedule(profile: &Profile, schedule: &Schedule, runner_script: &PathBuf) -> Result<(), String> {
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
    <string>/tmp/backup-{}.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/backup-{}.err</string>
</dict>
</plist>"#,
        profile.id,
        runner_script.display(),
        calendar_interval,
        get_config_dir()?.display(),
        profile.id,
        profile.id
    );

    fs::write(&plist_path, plist_content).map_err(|e| e.to_string())?;

    // Unload any existing job first
    let _ = tokio::process::Command::new("launchctl")
        .args(&["unload", "-w", &plist_path.to_string_lossy()])
        .output()
        .await;

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
    <string>/tmp/backup-{}.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/backup-{}.err</string>
</dict>
</plist>"#,
        profile.id,
        runner_script.display(),
        calendar_interval,
        get_config_dir()?.display(),
        profile.id,
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

fn calculate_next_run(schedule: &Schedule) -> Option<DateTime<Utc>> {
    if !schedule.enabled {
        return None;
    }

    let time = NaiveTime::parse_from_str(&schedule.time, "%H:%M").ok()?;
    let now_local = Local::now();
    let now_utc = now_local.with_timezone(&Utc);
    let today_local = now_local.date_naive();
    
    match schedule.frequency {
        ScheduleFrequency::Daily => {
            // Try today first - create local datetime then convert to UTC
            let today_at_time_local = today_local.and_time(time);
            let today_local_dt = Local.from_local_datetime(&today_at_time_local).single()?;
            let today_utc = today_local_dt.with_timezone(&Utc);
            
            if today_utc > now_utc {
                // Today's time hasn't passed yet
                Some(today_utc)
            } else {
                // Tomorrow at the scheduled time
                let tomorrow_local = today_local + Duration::days(1);
                let tomorrow_at_time_local = tomorrow_local.and_time(time);
                let tomorrow_local_dt = Local.from_local_datetime(&tomorrow_at_time_local).single()?;
                let tomorrow_utc = tomorrow_local_dt.with_timezone(&Utc);
                Some(tomorrow_utc)
            }
        },
        ScheduleFrequency::Weekly(target_weekday) => {
            let current_weekday = today_local.weekday().num_days_from_sunday() as u8;
            let days_until_target = if target_weekday >= current_weekday {
                target_weekday - current_weekday
            } else {
                7 - current_weekday + target_weekday
            };
            
            let target_date = if days_until_target == 0 {
                // It's the target weekday today
                let today_at_time_local = today_local.and_time(time);
                let today_local_dt = Local.from_local_datetime(&today_at_time_local).single()?;
                let today_utc = today_local_dt.with_timezone(&Utc);
                
                if today_utc > now_utc {
                    today_local // Today's time hasn't passed yet
                } else {
                    today_local + Duration::days(7) // Next week
                }
            } else {
                today_local + Duration::days(days_until_target as i64)
            };
            
            let target_datetime_local = target_date.and_time(time);
            let target_local_dt = Local.from_local_datetime(&target_datetime_local).single()?;
            Some(target_local_dt.with_timezone(&Utc))
        },
        ScheduleFrequency::Monthly(target_day) => {
            let current_day = today_local.day() as u8;
            
            // Try this month first
            if target_day >= current_day {
                if let Some(target_date) = NaiveDate::from_ymd_opt(today_local.year(), today_local.month(), target_day as u32) {
                    let target_datetime_local = target_date.and_time(time);
                    let target_local_dt = Local.from_local_datetime(&target_datetime_local).single()?;
                    let target_utc = target_local_dt.with_timezone(&Utc);
                    
                    if target_utc > now_utc {
                        return Some(target_utc);
                    }
                }
            }
            
            // Next month
            let next_month = if today_local.month() == 12 {
                NaiveDate::from_ymd_opt(today_local.year() + 1, 1, target_day as u32)
            } else {
                NaiveDate::from_ymd_opt(today_local.year(), today_local.month() + 1, target_day as u32)
            };
            
            if let Some(target_date) = next_month {
                let target_datetime_local = target_date.and_time(time);
                let target_local_dt = Local.from_local_datetime(&target_datetime_local).single()?;
                Some(target_local_dt.with_timezone(&Utc))
            } else {
                None
            }
        }
    }
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