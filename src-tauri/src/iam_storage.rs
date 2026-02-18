use tauri::command;
use serde::{Serialize, Deserialize};
use std::fs;
use crate::config::get_config_dir;

const KEYCHAIN_SERVICE: &str = "cloud-backup-app";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IAMCredentials {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub iam_username: String,
    pub bucket: String,
    pub s3_prefix: String,
}

fn keychain_entry(user_id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, &format!("iam-{}", user_id))
        .map_err(|e| format!("Failed to create keychain entry: {}", e))
}

fn legacy_creds_path(user_id: &str) -> Result<std::path::PathBuf, String> {
    let config_dir = get_config_dir()?;
    Ok(config_dir.join(format!("iam-{}.json", user_id)))
}

fn delete_legacy_file(user_id: &str) {
    if let Ok(path) = legacy_creds_path(user_id) {
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }
}

#[command]
pub async fn store_iam_credentials(
    user_id: String,
    credentials: IAMCredentials
) -> Result<(), String> {
    let json = serde_json::to_string(&credentials)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;

    let entry = keychain_entry(&user_id)?;
    entry.set_password(&json)
        .map_err(|e| format!("Failed to store credentials in Keychain: {}", e))?;

    // Remove legacy plaintext file if it exists
    delete_legacy_file(&user_id);

    Ok(())
}

#[command]
pub async fn get_stored_iam_credentials(
    user_id: String
) -> Result<Option<IAMCredentials>, String> {
    let entry = keychain_entry(&user_id)?;

    match entry.get_password() {
        Ok(json) => {
            let credentials: IAMCredentials = serde_json::from_str(&json)
                .map_err(|e| format!("Failed to parse credentials from Keychain: {}", e))?;
            Ok(Some(credentials))
        }
        Err(keyring::Error::NoEntry) => {
            // Check for legacy JSON file and migrate if found
            let legacy_path = legacy_creds_path(&user_id)?;
            if legacy_path.exists() {
                let content = fs::read_to_string(&legacy_path)
                    .map_err(|e| format!("Failed to read legacy credentials file: {}", e))?;
                let credentials: IAMCredentials = serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse legacy credentials: {}", e))?;

                // Migrate to Keychain
                let json = serde_json::to_string(&credentials)
                    .map_err(|e| format!("Failed to serialize credentials for migration: {}", e))?;
                entry.set_password(&json)
                    .map_err(|e| format!("Failed to migrate credentials to Keychain: {}", e))?;

                // Delete legacy file after successful migration
                let _ = fs::remove_file(&legacy_path);

                Ok(Some(credentials))
            } else {
                Ok(None)
            }
        }
        Err(e) => Err(format!("Failed to read credentials from Keychain: {}", e)),
    }
}

#[command]
pub async fn delete_iam_credentials(user_id: String) -> Result<(), String> {
    let entry = keychain_entry(&user_id)?;
    match entry.delete_credential() {
        Ok(()) => {}
        Err(keyring::Error::NoEntry) => {} // Already gone
        Err(e) => return Err(format!("Failed to delete credentials from Keychain: {}", e)),
    }

    // Also remove legacy file if present
    delete_legacy_file(&user_id);

    Ok(())
}

/// Creates rclone config file for scheduled backups using IAM credentials.
/// Sets restrictive file permissions (0o600) since the file contains secrets.
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

    fs::write(&rclone_scheduled_conf, &rclone_config)
        .map_err(|e| format!("Failed to write rclone scheduled config: {}", e))?;

    // Set restrictive permissions - only owner can read/write
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        fs::set_permissions(&rclone_scheduled_conf, perms)
            .map_err(|e| format!("Failed to set config file permissions: {}", e))?;
    }

    Ok(rclone_scheduled_conf.to_string_lossy().to_string())
}

/// Deletes the scheduled rclone config file containing IAM credentials.
pub fn delete_scheduled_rclone_config_file() -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let rclone_scheduled_conf = config_dir.join("rclone-scheduled.conf");
    if rclone_scheduled_conf.exists() {
        fs::remove_file(&rclone_scheduled_conf)
            .map_err(|e| format!("Failed to delete scheduled rclone config: {}", e))?;
    }
    Ok(())
}
