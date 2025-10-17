use tauri::command;
use serde::{Serialize, Deserialize};
use std::fs;
use crate::config::get_config_dir;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IAMCredentials {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub iam_username: String,
    pub bucket: String,
    pub s3_prefix: String,
}

#[command]
pub async fn store_iam_credentials(
    user_id: String,
    credentials: IAMCredentials
) -> Result<(), String> {
    let config_dir = get_config_dir()?;

    // Ensure directory exists
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    let creds_file = config_dir.join(format!("iam-{}.json", user_id));

    println!("Storing IAM credentials for user: {} at: {}", user_id, creds_file.display());

    // TODO: Add encryption here using system keychain
    // For macOS: Use Security framework
    // For Windows: Use Windows Credential Manager
    // For Linux: Use Secret Service API (libsecret)
    // For now, just write to file with warning

    let json = serde_json::to_string_pretty(&credentials)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;

    fs::write(&creds_file, json)
        .map_err(|e| format!("Failed to write credentials file: {}", e))?;

    println!("IAM credentials stored successfully");
    println!("⚠️  WARNING: Credentials are stored unencrypted. Add keychain integration for production!");

    Ok(())
}

#[command]
pub async fn get_stored_iam_credentials(
    user_id: String
) -> Result<Option<IAMCredentials>, String> {
    let config_dir = get_config_dir()?;
    let creds_file = config_dir.join(format!("iam-{}.json", user_id));

    println!("Looking for stored IAM credentials at: {}", creds_file.display());

    if !creds_file.exists() {
        println!("No stored credentials found for user: {}", user_id);
        return Ok(None);
    }

    let content = fs::read_to_string(&creds_file)
        .map_err(|e| format!("Failed to read credentials file: {}", e))?;

    let credentials: IAMCredentials = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse credentials: {}", e))?;

    println!("Found stored IAM credentials for user: {}", user_id);
    Ok(Some(credentials))
}

#[command]
pub async fn delete_iam_credentials(user_id: String) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let creds_file = config_dir.join(format!("iam-{}.json", user_id));

    if creds_file.exists() {
        fs::remove_file(&creds_file)
            .map_err(|e| format!("Failed to delete credentials: {}", e))?;
        println!("IAM credentials deleted for user: {}", user_id);
    }

    Ok(())
}

/// Creates rclone config file for scheduled backups using IAM credentials
#[command]
pub async fn create_scheduled_rclone_config(
    credentials: IAMCredentials
) -> Result<String, String> {
    let config_dir = get_config_dir()?;

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    let rclone_scheduled_conf = config_dir.join("rclone-scheduled.conf");

    let rclone_config = format!(
        "[aws]
type = s3
provider = AWS
env_auth = false
access_key_id = {}
secret_access_key = {}
region = {}
acl = private

",
        credentials.access_key_id,
        credentials.secret_access_key,
        credentials.region
    );

    println!("Creating scheduled rclone config at: {}", rclone_scheduled_conf.display());
    fs::write(&rclone_scheduled_conf, &rclone_config)
        .map_err(|e| format!("Failed to write rclone scheduled config: {}", e))?;

    println!("Scheduled rclone config created successfully");
    Ok(rclone_scheduled_conf.to_string_lossy().to_string())
}
