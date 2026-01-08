use std::fs;
use std::path::PathBuf;
use tauri::command;
use chrono::{Utc, Local, NaiveTime, NaiveDate, DateTime, Timelike, Datelike, Duration, TimeZone};

use crate::models::*;
use crate::config::{get_config_dir, load_config, save_config};

#[command]
pub async fn schedule_backup(profile_id: String, mut schedule: Schedule) -> Result<(), String> {
    println!("[DEBUG] schedule_backup called with profile_id: {}", profile_id);
    println!("[DEBUG] schedule: {:?}", schedule);
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
        println!("[DEBUG] Creating OS schedule...");
        match create_simple_os_schedule(profile, &schedule).await {
            Ok(_) => println!("[DEBUG] OS schedule created successfully"),
            Err(e) => {
                println!("[DEBUG] Failed to create OS schedule: {}", e);
                return Err(format!("Failed to create OS schedule: {}", e));
            }
        }
        
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

#[allow(dead_code)]
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
    use crate::binary_resolver::get_rclone_binary_path;

    let script_ext = if cfg!(windows) { "ps1" } else { "sh" };
    let script_name = format!("backup-{}.{}", profile.id, script_ext);
    let script_path = scripts_dir.join(&script_name);

    let destination = profile.destination();
    let flags = profile.rclone_flags.join(" ");

    let operation = match profile.mode {
        BackupMode::Copy => "copy",
        BackupMode::Sync => "sync",
    };

    // Get actual rclone binary path (not "bundled" string)
    let rclone_bin = get_rclone_binary_path()
        .map(|p| {
            let path_str = p.to_string_lossy().to_string();
            // Strip Windows extended-length path prefix \\?\ for script compatibility
            if path_str.starts_with(r"\\?\") {
                path_str.trim_start_matches(r"\\?\").to_string()
            } else {
                path_str
            }
        })
        .unwrap_or_else(|_| "rclone".to_string()); // Fallback to system rclone

    // Use scheduled rclone config (has permanent IAM credentials)
    let config_dir = get_config_dir()?;
    let scheduled_config = config_dir.join("rclone-scheduled.conf");
    let rclone_config = if scheduled_config.exists() {
        scheduled_config.to_string_lossy().to_string()
    } else {
        // Fallback to regular config (temporary credentials - will fail)
        profile.rclone_conf.clone()
    };

    let script_content = if cfg!(windows) {
        // PowerShell script for Windows
        format!(
            r#"# Cloud Backup App - Scheduled Backup Script
# Profile: {}
# Generated: {}
# Uses permanent IAM credentials

$ErrorActionPreference = "Continue"

$RCLONE_BIN = "{}"
$RCLONE_CONFIG = "{}"
$DESTINATION = "{}"
$OPERATION = "{}"
$FLAGS = "{}"

# Log file
$LOG_DIR = Join-Path $env:APPDATA "cloud-backup-app\logs"
$LOG_FILE = Join-Path $LOG_DIR "backup-{}.log"
if (!(Test-Path $LOG_DIR)) {{
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}}

function Write-Log {{
    param($Message)
    $Timestamp = Get-Date -Format "ddd MMM dd HH:mm:ss K yyyy"
    "$Timestamp : $Message" | Out-File -FilePath $LOG_FILE -Append -Encoding UTF8
}}

Write-Log "Starting scheduled backup for profile {}"
Write-Log "Using rclone: $RCLONE_BIN"
Write-Log "Using config: $RCLONE_CONFIG"

$BackupSuccess = $true
try {{
    # Backup each source
    {}
}} catch {{
    Write-Log "ERROR: Backup failed with exception: $_"
    $BackupSuccess = $false
}}

if ($BackupSuccess) {{
    Write-Log "Backup completed for profile {}"
}} else {{
    Write-Log "Backup completed with errors for profile {}"
}}
"#,
            profile.name,
            Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
            rclone_bin.replace("\\", "\\\\"),
            rclone_config.replace("\\", "\\\\"),
            destination,
            operation,
            flags,
            profile.id,
            profile.name,
            generate_backup_commands_windows(&profile.sources, &destination, operation, &flags),
            profile.name,
            profile.name
        )
    } else {
        // Bash script for macOS/Linux
        format!(
            r#"#!/bin/bash
set -euo pipefail

# Cloud Backup App - Scheduled Backup Script
# Profile: {}
# Generated: {}
# Uses permanent IAM credentials (not temporary Cognito credentials)

RCLONE_BIN="{}"
RCLONE_CONFIG="{}"
DESTINATION="{}"
OPERATION="{}"
FLAGS="{}"

# Log file
LOG_FILE="$HOME/.config/cloud-backup-app/logs/backup-{}.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "$(date): Starting scheduled backup for profile {}" >> "$LOG_FILE"
echo "$(date): Using rclone: $RCLONE_BIN" >> "$LOG_FILE"
echo "$(date): Using config: $RCLONE_CONFIG" >> "$LOG_FILE"

# Backup each source
{}

echo "$(date): Backup completed for profile {}" >> "$LOG_FILE"
"#,
            profile.name,
            Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
            rclone_bin,
            rclone_config,
            destination,
            operation,
            flags,
            profile.id,
            profile.name,
            generate_backup_commands(&profile.sources, &destination, operation, &flags),
            profile.name
        )
    };

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
        .map(|source| {
            // Extract folder name from source path to preserve folder structure
            // E.g., /Users/john/Documents -> Documents
            let source_folder_name = std::path::Path::new(source)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown");

            // Append source folder name to destination
            // E.g., aws:bucket/users/john-id/Documents
            let destination_with_folder = format!("{}/{}", destination, source_folder_name);

            format!(
                r#"echo "$(date): Backing up {} to {}" >> "$LOG_FILE"
"$RCLONE_BIN" {} "{}" "{}" --config "$RCLONE_CONFIG" {} --log-file "$LOG_FILE" --log-level INFO"#,
                source, destination_with_folder, operation, source, destination_with_folder, flags
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

#[cfg(target_os = "windows")]
fn generate_backup_commands_windows(sources: &[String], destination: &str, operation: &str, flags: &str) -> String {
    sources.iter()
        .map(|source| {
            // Extract folder name from source path to preserve folder structure
            let source_folder_name = std::path::Path::new(source)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown");

            // Append source folder name to destination
            let destination_with_folder = format!("{}/{}", destination, source_folder_name);

            format!(
                r#"Write-Log "Backing up {} to {}"
& $RCLONE_BIN {} "{}" "{}" --config $RCLONE_CONFIG {} --log-file $LOG_FILE --log-level INFO
if ($LASTEXITCODE -ne 0) {{
    Write-Log "ERROR: Backup failed for {} with exit code $LASTEXITCODE"
    $BackupSuccess = $false
}}"#,
                source, destination_with_folder,
                operation, source, destination_with_folder, flags,
                source
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

// Stub for non-Windows platforms to avoid compilation errors
#[cfg(not(target_os = "windows"))]
fn generate_backup_commands_windows(_sources: &[String], _destination: &str, _operation: &str, _flags: &str) -> String {
    String::new()
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
#[allow(dead_code)]
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
async fn create_windows_schedule(profile: &Profile, schedule: &Schedule, runner_script: &PathBuf) -> Result<(), String> {
    let task_name = format!("CloudBackup\\backup-{}", profile.id);

    // PowerShell execution command with proper flags
    let task_run = format!(
        "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File \"{}\"",
        runner_script.display()
    );

    let time = NaiveTime::parse_from_str(&schedule.time, "%H:%M")
        .map_err(|_| "Invalid time format")?;
    let start_time = format!("{:02}:{:02}", time.hour(), time.minute());

    // Calculate start date - use today if the time hasn't passed yet
    let now = Local::now();
    let today = now.date_naive();
    let today_at_scheduled_time = today.and_time(time);
    let scheduled_datetime = Local.from_local_datetime(&today_at_scheduled_time)
        .single()
        .ok_or("Invalid local datetime")?;

    // If the scheduled time is in the future today, start today; otherwise start tomorrow
    let start_date = if scheduled_datetime > now {
        today
    } else {
        today + Duration::days(1)
    };
    let start_date_str = start_date.format("%m/%d/%Y").to_string();

    // Build schtasks arguments
    let mut args = vec![
        "/Create",
        "/TN", &task_name,
        "/TR", &task_run,
        "/ST", &start_time,
        "/SD", &start_date_str, // Add start date to control when task first runs
        "/RU", "SYSTEM", // Run as SYSTEM account so it runs whether user is logged in or not
        "/RL", "HIGHEST", // Run with highest privileges
        "/F", // Force overwrite if exists
    ];

    // Add frequency-specific arguments
    let (schedule_type, day_arg, day_value);
    match schedule.frequency {
        ScheduleFrequency::Daily => {
            schedule_type = "DAILY";
            args.extend(&["/SC", &schedule_type]);
        },
        ScheduleFrequency::Weekly(day) => {
            schedule_type = "WEEKLY";
            day_arg = match day {
                0 => "SUN",
                1 => "MON",
                2 => "TUE",
                3 => "WED",
                4 => "THU",
                5 => "FRI",
                6 => "SAT",
                _ => return Err("Invalid weekday".to_string()),
            };
            args.extend(&["/SC", &schedule_type, "/D", day_arg]);
        },
        ScheduleFrequency::Monthly(day) => {
            schedule_type = "MONTHLY";
            day_value = day.to_string();
            args.extend(&["/SC", &schedule_type, "/D", &day_value]);
        },
    };

    // Delete existing task first (ignore errors if it doesn't exist)
    let _ = tokio::process::Command::new("schtasks")
        .args(&["/Delete", "/TN", &task_name, "/F"])
        .output()
        .await;

    println!("[DEBUG] Creating Windows scheduled task: {}", task_name);
    println!("[DEBUG] Current time: {}", now.format("%Y-%m-%d %H:%M:%S"));
    println!("[DEBUG] Scheduled time: {}", scheduled_datetime.format("%Y-%m-%d %H:%M:%S"));
    println!("[DEBUG] Start date: {}", start_date_str);
    println!("[DEBUG] Task arguments: {:?}", args);

    // Create the scheduled task
    let output = tokio::process::Command::new("schtasks")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to execute schtasks: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to create scheduled task: {}", stderr));
    }

    println!("[DEBUG] Windows scheduled task created successfully");
    Ok(())
}

#[cfg(target_os = "linux")]
async fn create_systemd_schedule(_profile: &Profile, _schedule: &Schedule, _runner_script: &PathBuf) -> Result<(), String> {
    // Systemd user timer implementation would go here
    Err("Linux systemd scheduling not implemented yet".to_string())
}

pub fn calculate_next_run(schedule: &Schedule) -> Option<DateTime<Utc>> {
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

    #[cfg(target_os = "windows")]
    {
        let task_name = format!("CloudBackup\\backup-{}", profile.id);

        // Delete the scheduled task
        let output = tokio::process::Command::new("schtasks")
            .args(&["/Delete", "/TN", &task_name, "/F"])
            .output()
            .await;

        if let Ok(output) = output {
            if !output.status.success() {
                println!("[DEBUG] Failed to delete task (may not exist): {}",
                    String::from_utf8_lossy(&output.stderr));
            }
        }
    }

    // Remove the runner script (cross-platform)
    let config_dir = get_config_dir()?;
    let script_ext = if cfg!(windows) { "ps1" } else { "sh" };
    let script_path = config_dir.join("scripts").join(format!("backup-{}.{}", profile.id, script_ext));
    if script_path.exists() {
        fs::remove_file(script_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}