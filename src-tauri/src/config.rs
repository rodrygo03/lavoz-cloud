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

    let content = fs::read_to_string(config_file).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub async fn save_config(config: &AppConfig) -> Result<(), String> {
    let config_file = get_config_file()?;
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(config_file, content).map_err(|e| e.to_string())
}

#[command]
pub async fn get_profiles() -> Result<Vec<Profile>, String> {
    let config = load_config().await?;
    Ok(config.profiles)
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
    
    if let Some(existing) = config.profiles.iter_mut().find(|p| p.id == profile.id) {
        let mut updated_profile = profile;
        updated_profile.updated_at = Utc::now();
        *existing = updated_profile.clone();
        
        config.updated_at = Utc::now();
        save_config(&config).await?;
        Ok(updated_profile)
    } else {
        Err("Profile not found".to_string())
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
    // Detect rclone binary
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
    
    // Set default rclone config path
    let config_dir = get_config_dir()?;
    let rclone_conf = config_dir.join("rclone.conf").to_string_lossy().to_string();
    
    // Update profile with detected paths
    let mut config = load_config().await?;
    let profile = config.profiles.iter_mut()
        .find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;
        
    profile.rclone_bin = rclone_binary;
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