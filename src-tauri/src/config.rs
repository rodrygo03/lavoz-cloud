use std::fs;
use std::path::PathBuf;
use chrono::Utc;
use tauri::command;
use std::process::Stdio;
use tokio::process::Command;

use crate::models::*;

#[tauri::command]
pub async fn initialize_config() -> Result<(), String> {
    let config_dir = get_config_dir()?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }

    let config_file = config_dir.join("config.json");
    if !config_file.exists() {
        let default_config = AppConfig::default();
        save_config(&default_config).await?;
    }

    Ok(())
}

pub fn get_config_dir() -> Result<PathBuf, String> {
    dirs::config_dir()
        .map(|dir| dir.join("cloud-backup-app"))
        .ok_or_else(|| "Could not determine config directory".to_string())
}

pub fn get_config_file() -> Result<PathBuf, String> {
    Ok(get_config_dir()?.join("config.json"))
}

pub async fn load_config() -> Result<AppConfig, String> {
    let config_file = get_config_file()?;

    if !config_file.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&config_file).map_err(|e| e.to_string())?;

    // Try to parse the config
    match serde_json::from_str(&content) {
        Ok(config) => Ok(config),
        Err(e) => {
            eprintln!("[ERROR] Config file is corrupted: {}", e);
            eprintln!("[ERROR] Attempting to recover...");

            // Try to fix common corruption issues
            let fixed_content = content.trim_end_matches("\"}").to_string() + "\n}";

            match serde_json::from_str(&fixed_content) {
                Ok(config) => {
                    eprintln!("[RECOVERY] Successfully recovered config");
                    // Save the fixed version
                    let config_ref: AppConfig = config;
                    if let Err(save_err) = save_config(&config_ref).await {
                        eprintln!("[ERROR] Failed to save recovered config: {}", save_err);
                    } else {
                        eprintln!("[RECOVERY] Saved fixed config file");
                    }
                    Ok(config_ref)
                }
                Err(_) => {
                    // Backup the corrupted file and return error
                    let backup_path = config_file.with_extension("json.corrupted");
                    let _ = fs::copy(&config_file, &backup_path);
                    Err(format!("Config file is corrupted and cannot be recovered. Original saved to: {:?}. Error: {}", backup_path, e))
                }
            }
        }
    }
}

pub async fn save_config(config: &AppConfig) -> Result<(), String> {
    let config_file = get_config_file()?;
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;

    // Validate JSON before writing to ensure it's properly formatted
    let _: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Generated invalid JSON: {}", e))?;

    // Write atomically using a temp file + rename to prevent corruption
    let temp_file = config_file.with_extension("json.tmp");
    fs::write(&temp_file, content).map_err(|e| e.to_string())?;
    fs::rename(&temp_file, &config_file).map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn get_profiles() -> Result<Vec<Profile>, String> {
    let config = load_config().await?;
    Ok(config.profiles)
}

#[command]
pub async fn get_or_create_user_profile(
    user_id: String,
    email: String,
    is_admin: bool,
    bucket: String,
    access_key_id: String,
    secret_access_key: String,
    session_token: String,
    region: String,
) -> Result<Profile, String> {
    let mut config = load_config().await?;

    // Check if user already has a profile
    if let Some(profile_index) = config.profiles.iter().position(|p| p.user_id.as_ref() == Some(&user_id)) {
        let mut profile_updated = false;

        // Check if admin status has changed
        let expected_profile_type = if is_admin {
            ProfileType::Admin
        } else {
            ProfileType::User
        };

        // Update profile type if changed
        if config.profiles[profile_index].profile_type != expected_profile_type {
            config.profiles[profile_index].profile_type = expected_profile_type;
            config.profiles[profile_index].updated_at = Utc::now();
            profile_updated = true;
        }

        // Update prefix if changed (recalculate based on current admin status)
        let expected_prefix = if is_admin {
            format!("admins/{}", user_id)
        } else {
            format!("users/{}", user_id)
        };

        if config.profiles[profile_index].prefix != expected_prefix {
            config.profiles[profile_index].prefix = expected_prefix;
            config.profiles[profile_index].updated_at = Utc::now();
            profile_updated = true;
        }

        // Update rclone config with new credentials (they may have been refreshed)
        update_rclone_config_for_cognito(
            &config.profiles[profile_index],
            &access_key_id,
            &secret_access_key,
            &session_token,
            &region
        ).await?;

        // Save config if profile was updated
        if profile_updated {
            config.updated_at = Utc::now();
            save_config(&config).await?;
        }

        return Ok(config.profiles[profile_index].clone());
    }

    // Create new profile for this user
    let profile_type = if is_admin {
        ProfileType::Admin
    } else {
        ProfileType::User
    };

    let mut profile = Profile::new(email.clone(), profile_type);
    profile.user_id = Some(user_id.clone());
    profile.bucket = bucket;

    // Use Cognito user ID based folder structure (must match IAM policy)
    // Structure:
    // - Regular users: s3://bucket/users/{cognito-user-id}/
    // - Admin users: s3://bucket/admins/{cognito-user-id}/
    // All admins can see all admin folders (enforced by IAM policy)
    profile.prefix = if is_admin {
        format!("admins/{}", user_id) // Each admin gets their own folder: admins/{cognito-sub}/
    } else {
        format!("users/{}", user_id) // Regular users get users/{cognito-sub}/
    };

    // TODO: On first backup, create a .user-info.json file in the user's folder
    // containing their email so admins can identify folders easily

    // Generate rclone config with temporary credentials
    let config_dir = get_config_dir()?;
    let rclone_conf_path = config_dir.join("rclone.conf");
    profile.rclone_conf = rclone_conf_path.to_string_lossy().to_string();

    update_rclone_config_for_cognito(
        &profile,
        &access_key_id,
        &secret_access_key,
        &session_token,
        &region
    ).await?;

    // Add to config
    config.profiles.push(profile.clone());
    config.active_profile_id = Some(profile.id.clone());
    config.updated_at = Utc::now();

    save_config(&config).await?;
    Ok(profile)
}

async fn update_rclone_config_for_cognito(
    _profile: &Profile,
    access_key_id: &str,
    secret_access_key: &str,
    session_token: &str,
    region: &str,
) -> Result<(), String> {
    let config_dir = get_config_dir()?;

    // Ensure config directory exists
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    let rclone_conf_path = config_dir.join("rclone.conf");

    let rclone_config = format!(
        "[aws]
type = s3
provider = AWS
env_auth = false
access_key_id = {}
secret_access_key = {}
session_token = {}
region = {}
acl = private

",
        access_key_id,
        secret_access_key,
        session_token,
        region
    );

    println!("Writing rclone config to: {}", rclone_conf_path.display());
    fs::write(&rclone_conf_path, &rclone_config)
        .map_err(|e| format!("Failed to write rclone config: {}", e))?;

    println!("Rclone config written successfully");
    Ok(())
}

#[command]
pub async fn create_profile(name: String, profile_type: ProfileType) -> Result<Profile, String> {
    let mut config = load_config().await?;
    let profile = Profile::new(name, profile_type);
    
    config.profiles.push(profile.clone());
    config.updated_at = Utc::now();
    
    save_config(&config).await?;
    Ok(profile)
}

#[command]
pub async fn update_profile(profile: Profile) -> Result<Profile, String> {
    let mut config = load_config().await?;

    println!("Attempting to update profile with ID: {}", profile.id);
    println!("Existing profile IDs in config: {:?}", config.profiles.iter().map(|p| &p.id).collect::<Vec<_>>());

    if let Some(existing) = config.profiles.iter_mut().find(|p| p.id == profile.id) {
        let mut updated_profile = profile;
        updated_profile.updated_at = Utc::now();
        *existing = updated_profile.clone();

        config.updated_at = Utc::now();
        save_config(&config).await?;
        println!("Profile updated successfully");
        Ok(updated_profile)
    } else {
        println!("Profile not found! Looking for ID: {}", profile.id);
        Err(format!("Profile not found. Looking for ID: {}, Available IDs: {:?}",
            profile.id,
            config.profiles.iter().map(|p| &p.id).collect::<Vec<_>>()))
    }
}

#[command]
pub async fn delete_profile(profile_id: String) -> Result<(), String> {
    let mut config = load_config().await?;
    
    let initial_len = config.profiles.len();
    config.profiles.retain(|p| p.id != profile_id);
    
    if config.profiles.len() == initial_len {
        return Err("Profile not found".to_string());
    }

    // If we deleted the active profile, clear it
    if config.active_profile_id.as_ref() == Some(&profile_id) {
        config.active_profile_id = None;
    }

    config.updated_at = Utc::now();
    save_config(&config).await?;
    Ok(())
}

#[command]
pub async fn get_active_profile() -> Result<Option<Profile>, String> {
    let config = load_config().await?;
    
    if let Some(active_id) = config.active_profile_id {
        Ok(config.profiles.into_iter().find(|p| p.id == active_id))
    } else {
        Ok(None)
    }
}

#[command]
pub async fn set_active_profile(profile_id: String) -> Result<(), String> {
    let mut config = load_config().await?;
    
    // Verify the profile exists
    if !config.profiles.iter().any(|p| p.id == profile_id) {
        return Err("Profile not found".to_string());
    }

    config.active_profile_id = Some(profile_id);
    config.updated_at = Utc::now();
    save_config(&config).await?;
    Ok(())
}

#[command]
pub async fn auto_configure_rclone(profile_id: String) -> Result<Profile, String> {
    // Use bundled rclone - no need to detect system installation
    
    // Set default rclone config path
    let config_dir = get_config_dir()?;
    let rclone_conf = config_dir.join("rclone.conf").to_string_lossy().to_string();
    
    // Update profile with rclone config path (rclone_bin is already set to "bundled")
    let mut config = load_config().await?;
    let profile = config.profiles.iter_mut()
        .find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;
        
    profile.rclone_conf = rclone_conf;
    profile.updated_at = Utc::now();
    
    let updated_profile = profile.clone();
    config.updated_at = Utc::now();
    save_config(&config).await?;
    
    Ok(updated_profile)
}

#[command]
pub async fn generate_rclone_config(_profile_id: String, remote_name: String, access_key: String, secret_key: String, region: String) -> Result<String, String> {
    let config_dir = get_config_dir()?;
    let rclone_conf_path = config_dir.join("rclone.conf");
    
    let rclone_config = format!(
        "[{}]
type = s3
provider = AWS
access_key_id = {}
secret_access_key = {}
region = {}
location_constraint = {}

",
        remote_name,
        access_key,
        secret_key,
        region,
        region
    );
    
    fs::write(&rclone_conf_path, rclone_config).map_err(|e| e.to_string())?;
    
    Ok(rclone_conf_path.to_string_lossy().to_string())
}

#[command]
pub async fn save_backup_operation(operation: crate::models::BackupOperation) -> Result<(), String> {
    let mut config = load_config().await?;

    // Add the new operation to the beginning of the list (most recent first)
    config.backup_operations.insert(0, operation);

    // Keep only the last 100 operations to avoid unlimited growth
    if config.backup_operations.len() > 100 {
        config.backup_operations.truncate(100);
    }

    config.updated_at = chrono::Utc::now();
    save_config(&config).await?;
    Ok(())
}

#[command]
pub async fn clear_backup_operations() -> Result<usize, String> {
    let mut config = load_config().await?;
    let count = config.backup_operations.len();

    config.backup_operations.clear();
    config.updated_at = chrono::Utc::now();

    save_config(&config).await?;

    println!("[DEBUG] Cleared {} backup operations", count);
    Ok(count)
}

#[command]
pub async fn sync_scheduled_backup_logs(profile_id: String) -> Result<u32, String> {
    use std::fs;
    use chrono::{Utc, TimeZone};
    use regex::Regex;

    // Use the same log directory as the backup script
    // Windows: %APPDATA%\cloud-backup-app\logs (via get_config_dir)
    // macOS/Linux: ~/.config/cloud-backup-app/logs (hardcoded to match bash script)
    let logs_dir = if cfg!(windows) {
        get_config_dir()?.join("logs")
    } else {
        let home_dir = dirs::home_dir().ok_or("Could not determine home directory")?;
        home_dir.join(".config/cloud-backup-app/logs")
    };
    let log_file = logs_dir.join(format!("backup-{}.log", profile_id));

    println!("[DEBUG] sync_scheduled_backup_logs: Looking for log file at: {:?}", log_file);

    if !log_file.exists() {
        println!("[DEBUG] sync_scheduled_backup_logs: Log file does not exist");
        return Ok(0); // No log file, no operations to sync
    }

    // Load existing operations to check for duplicates
    let config = load_config().await?;
    let existing_operations: Vec<&crate::models::BackupOperation> = config.backup_operations
        .iter()
        .filter(|op| op.profile_id == profile_id)
        .collect();

    println!("[DEBUG] sync_scheduled_backup_logs: Found {} existing operations for profile {}",
        existing_operations.len(), profile_id);

    let log_content = fs::read_to_string(&log_file).map_err(|e| e.to_string())?;
    let mut operations_created = 0;

    println!("[DEBUG] sync_scheduled_backup_logs: Log file has {} bytes", log_content.len());
    
    // Parse the log file for backup operations
    // Support both "Starting backup" and "Starting scheduled backup"
    // Note: \s+ handles variable whitespace (date command uses padding for single-digit days)
    let start_regex = Regex::new(r"(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\w{3}\s+\d{4}): Starting (?:scheduled )?backup for profile (.+)").unwrap();
    let complete_regex = Regex::new(r"(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\w{3}\s+\d{4}): Backup completed for profile (.+)").unwrap();
    let transferred_regex = Regex::new(r"Transferred:\s+(\d+) / (\d+), \d+%").unwrap();
    let stats_regex = Regex::new(r"Transferred:\s+([0-9.,]+\s*[KMGT]?i?B) / ([0-9.,]+\s*[KMGT]?i?B)").unwrap();
    
    let lines: Vec<&str> = log_content.lines().collect();
    let mut current_operation: Option<crate::models::BackupOperation> = None;

    println!("[DEBUG] sync_scheduled_backup_logs: Processing {} lines", lines.len());

    for line in lines {
        if let Some(caps) = start_regex.captures(line) {
            println!("[DEBUG] Matched start line: {}", line);
            let timestamp_str = &caps[1];
            let profile_name = &caps[2];

            // Parse timestamp - format: "Wed Aug 20 00:22:05 CDT 2025"
            // The script uses $(date) which outputs in local timezone
            let time_parts: Vec<&str> = timestamp_str.split_whitespace().collect();
            if time_parts.len() >= 6 {
                // Format: ["Wed", "Aug", "20", "00:22:05", "CDT", "2025"]
                // We want: "Aug 20 2025 00:22:05"
                let date_time_str = format!("{} {} {} {}", time_parts[1], time_parts[2], time_parts[5], time_parts[3]);
                if let Ok(start_time) = chrono::NaiveDateTime::parse_from_str(&date_time_str, "%b %d %Y %H:%M:%S") {
                    // Convert from local time to UTC
                    use chrono::Local;
                    let start_time_utc = Local.from_local_datetime(&start_time)
                        .earliest()
                        .map(|local_dt| local_dt.with_timezone(&Utc))
                        .unwrap_or_else(|| Utc.from_utc_datetime(&start_time));

                    println!("[DEBUG] Found backup start at: {:?}", start_time_utc);
                    current_operation = Some(crate::models::BackupOperation {
                        id: uuid::Uuid::new_v4().to_string(),
                        profile_id: profile_id.clone(),
                        operation_type: crate::models::OperationType::Backup,
                        status: crate::models::OperationStatus::Running,
                        started_at: start_time_utc,
                        completed_at: None,
                        files_transferred: 0,
                        bytes_transferred: 0,
                        error_message: None,
                        log_output: format!("Scheduled backup started for profile: {}", profile_name),
                    });
                }
            }
        } else if let Some(_caps) = complete_regex.captures(line) {
            println!("[DEBUG] Matched completion line: {}", line);
            if let Some(ref mut op) = current_operation {
                println!("[DEBUG] Marking operation as completed");
                op.status = crate::models::OperationStatus::Completed;
                op.completed_at = Some(Utc::now());

                // Check if this operation already exists (avoid duplicates on repeated syncs)
                let already_saved = existing_operations.iter().any(|existing_op| {
                    let diff = (existing_op.started_at.timestamp() - op.started_at.timestamp()).abs();
                    diff < 60 // Within 1 minute means it's the same operation
                });

                if !already_saved {
                    // Save the operation
                    println!("[DEBUG] Saving completed scheduled backup operation: id={}, started_at={:?}, files={}, bytes={}",
                        op.id, op.started_at, op.files_transferred, op.bytes_transferred);
                    save_backup_operation(op.clone()).await?;
                    operations_created += 1;
                } else {
                    println!("[DEBUG] Operation already saved, skipping duplicate at {:?}", op.started_at);
                }

                // ALWAYS update the schedule's last_run and next_run, even for duplicates
                // This ensures the schedule is correct even if the operation was synced before the schedule update logic was added
                update_schedule_after_run(&profile_id, op.started_at).await?;

                current_operation = None;
            }
        } else if let Some(ref mut op) = current_operation {
            // Accumulate log output
            op.log_output.push_str(&format!("\n{}", line));
            
            // Try to parse file counts and byte counts from various rclone output lines
            if line.contains("Transferred:") {
                if let Some(caps) = transferred_regex.captures(line) {
                    if let Ok(files) = caps[1].parse::<u64>() {
                        op.files_transferred = files;
                    }
                }
                if let Some(caps) = stats_regex.captures(line) {
                    let bytes_str = &caps[2];
                    if let Ok(bytes) = parse_byte_size(bytes_str) {
                        op.bytes_transferred = bytes;
                    }
                }
            }
        }
    }
    
    // If there's still an operation that wasn't completed, save it as well
    if let Some(mut op) = current_operation {
        op.status = crate::models::OperationStatus::Completed;
        op.completed_at = Some(Utc::now());
        let started_at = op.started_at;

        // Check if this operation already exists (avoid duplicates on repeated syncs)
        let already_saved = existing_operations.iter().any(|existing_op| {
            let diff = (existing_op.started_at.timestamp() - started_at.timestamp()).abs();
            diff < 60 // Within 1 minute means it's the same operation
        });

        if !already_saved {
            save_backup_operation(op).await?;
            operations_created += 1;
        } else {
            println!("[DEBUG] Final operation already saved, skipping duplicate at {:?}", started_at);
        }

        // ALWAYS update the schedule's last_run and next_run, even for duplicates
        // This ensures the schedule is correct even if the operation was synced before the schedule update logic was added
        update_schedule_after_run(&profile_id, started_at).await?;
    }

    println!("[DEBUG] sync_scheduled_backup_logs: Created {} new operations", operations_created);
    Ok(operations_created)
}

async fn update_schedule_after_run(profile_id: &str, backup_started_at: chrono::DateTime<Utc>) -> Result<(), String> {
    update_schedule_after_backup(profile_id, backup_started_at).await
}

/// Public function to update schedule after any backup (manual or scheduled)
pub async fn update_schedule_after_backup(profile_id: &str, backup_started_at: chrono::DateTime<Utc>) -> Result<(), String> {
    let mut config = load_config().await?;
    let mut updated = false;

    // Find the profile and update its schedule
    if let Some(profile) = config.profiles.iter_mut().find(|p| p.id == profile_id) {
        if let Some(ref mut schedule) = profile.schedule {
            if schedule.enabled {
                // Update last_run to when the backup started
                schedule.last_run = Some(backup_started_at);

                // Calculate and update next_run
                schedule.next_run = crate::schedule::calculate_next_run(schedule);

                profile.updated_at = Utc::now();
                updated = true;

                println!("[DEBUG] Updated schedule for profile {}: last_run={:?}, next_run={:?}",
                    profile_id, schedule.last_run, schedule.next_run);
            }
        }
    }

    if updated {
        config.updated_at = Utc::now();
        save_config(&config).await?;
    }

    Ok(())
}

fn parse_byte_size(size_str: &str) -> Result<u64, String> {
    let size_str = size_str.replace(",", "").replace(" ", "");
    
    if size_str.ends_with("KiB") {
        let num: f64 = size_str.trim_end_matches("KiB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1024.0) as u64)
    } else if size_str.ends_with("MiB") {
        let num: f64 = size_str.trim_end_matches("MiB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1024.0 * 1024.0) as u64)
    } else if size_str.ends_with("GiB") {
        let num: f64 = size_str.trim_end_matches("GiB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1024.0 * 1024.0 * 1024.0) as u64)
    } else if size_str.ends_with("B") {
        let num: u64 = size_str.trim_end_matches("B").parse().map_err(|e: std::num::ParseIntError| e.to_string())?;
        Ok(num)
    } else {
        size_str.parse::<u64>().map_err(|e| e.to_string())
    }
}

#[command]
pub async fn auto_setup_rclone_complete(profile_id: String) -> Result<Profile, String> {
    // Get the profile to access AWS config
    let mut config = load_config().await?;
    let profile = config.profiles.iter()
        .find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;
    
    // Check if profile has AWS config
    let aws_config = profile.aws_config.as_ref()
        .ok_or("Profile does not have AWS configuration. Please complete admin setup first.")?;
    
    // 1. Detect rclone binary
    let rclone_paths = vec![
        "/opt/homebrew/bin/rclone",
        "/usr/local/bin/rclone", 
        "/usr/bin/rclone",
        "rclone"
    ];
    
    let mut rclone_bin = None;
    for path in rclone_paths {
        let result = Command::new(path)
            .arg("version")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await;
            
        if let Ok(output) = result {
            if output.status.success() {
                rclone_bin = Some(path.to_string());
                break;
            }
        }
    }
    
    let rclone_binary = rclone_bin.ok_or("Could not find rclone binary. Please install rclone first.")?;
    
    // 2. Generate rclone config with AWS credentials
    let config_dir = get_config_dir()?;
    let rclone_conf_path = config_dir.join("rclone.conf");
    
    let remote_name = format!("{}-s3", profile.bucket.replace("-", "_"));
    let rclone_config = format!(
        "[{}]
type = s3
provider = AWS
access_key_id = {}
secret_access_key = {}
region = {}
location_constraint = {}

",
        remote_name,
        aws_config.aws_access_key_id,
        aws_config.aws_secret_access_key,
        aws_config.aws_region,
        aws_config.aws_region
    );
    
    fs::write(&rclone_conf_path, rclone_config).map_err(|e| format!("Failed to write rclone config: {}", e))?;
    
    // 3. Update profile with all the configuration
    let profile_mut = config.profiles.iter_mut()
        .find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;
        
    profile_mut.rclone_bin = rclone_binary;
    profile_mut.rclone_conf = rclone_conf_path.to_string_lossy().to_string();
    profile_mut.remote = remote_name;
    profile_mut.updated_at = Utc::now();
    
    let updated_profile = profile_mut.clone();
    config.updated_at = Utc::now();
    save_config(&config).await?;
    
    Ok(updated_profile)
}