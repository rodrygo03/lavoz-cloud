use std::process::Stdio;
use std::path::Path;
use serde_json::Value;
use tauri::command;
use tokio::process::Command;
use chrono::{DateTime, Utc};

use crate::models::*;

#[command]
pub async fn detect_rclone() -> Result<Vec<String>, String> {
    let mut candidates = Vec::new();
    
    // Common locations for rclone
    let common_paths = vec![
        "/usr/local/bin/rclone",
        "/opt/homebrew/bin/rclone",
        "/usr/bin/rclone",
        "rclone", // In PATH
    ];

    for path in common_paths {
        if let Ok(output) = Command::new(path)
            .arg("version")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
        {
            if output.status.success() {
                candidates.push(path.to_string());
            }
        }
    }

    // If no system rclone found, we could bundle one later
    if candidates.is_empty() {
        candidates.push("rclone (not found - will need to install or bundle)".to_string());
    }

    Ok(candidates)
}

#[command]
pub async fn validate_rclone_config(rclone_bin: String, config_path: String) -> Result<bool, String> {
    if !Path::new(&config_path).exists() {
        return Ok(false);
    }

    let output = Command::new(&rclone_bin)
        .args(&["config", "show", "--config", &config_path])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| e.to_string())?;

    Ok(output.status.success())
}

#[command]
pub async fn list_cloud_files(profile: Profile, path: Option<String>, max_depth: Option<u32>) -> Result<Vec<CloudFile>, String> {
    let target = if let Some(subpath) = path {
        format!("{}/{}", profile.destination(), subpath.trim_start_matches('/'))
    } else {
        profile.destination()
    };

    let mut args = vec![
        "lsjson".to_string(),
        target,
        "--fast-list".to_string(),
        "--config".to_string(),
        profile.rclone_conf.clone(),
    ];

    if let Some(depth) = max_depth {
        args.push("--max-depth".to_string());
        args.push(depth.to_string());
    } else {
        args.push("--recursive".to_string());
    }

    let output = Command::new(&profile.rclone_bin)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let json_output = String::from_utf8_lossy(&output.stdout);
    let items: Vec<Value> = serde_json::from_str(&json_output)
        .map_err(|e| format!("Failed to parse rclone output: {}", e))?;

    let mut files = Vec::new();
    for item in items {
        if let Some(file) = parse_rclone_item(&item)? {
            files.push(file);
        }
    }

    files.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir) // Directories first
        } else {
            a.name.cmp(&b.name)
        }
    });

    Ok(files)
}

fn parse_rclone_item(item: &Value) -> Result<Option<CloudFile>, String> {
    let obj = item.as_object().ok_or("Invalid rclone item format")?;
    
    let path = obj.get("Path")
        .and_then(|v| v.as_str())
        .ok_or("Missing Path in rclone item")?
        .to_string();

    let name = obj.get("Name")
        .and_then(|v| v.as_str())
        .unwrap_or(&path)
        .to_string();

    let size = obj.get("Size")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    let is_dir = obj.get("IsDir")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let mod_time = obj.get("ModTime")
        .and_then(|v| v.as_str())
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(Utc::now);

    let mime_type = obj.get("MimeType")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(Some(CloudFile {
        path,
        name,
        size,
        mod_time,
        is_dir,
        mime_type,
    }))
}

#[command]
pub async fn backup_preview(profile: Profile) -> Result<BackupPreview, String> {
    if profile.mode != BackupMode::Sync {
        // For copy mode, we just show what will be copied (no deletes)
        return Ok(BackupPreview {
            files_to_copy: Vec::new(),
            files_to_update: Vec::new(),
            files_to_delete: Vec::new(),
            total_files: 0,
            total_size: 0,
        });
    }

    let destination = profile.destination();
    let mut all_changes = Vec::new();

    for source in &profile.sources {
        let mut args = vec![
            "sync".to_string(),
            source.clone(),
            destination.clone(),
            "--dry-run".to_string(),
            "--stats=0".to_string(),
            "--config".to_string(),
            profile.rclone_conf.clone(),
        ];

        // Add custom flags
        for flag in &profile.rclone_flags {
            args.push(flag.clone());
        }

        let output = Command::new(&profile.rclone_bin)
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let output_text = String::from_utf8_lossy(&output.stderr);
        let changes = parse_dry_run_output(&output_text)?;
        all_changes.extend(changes);
    }

    let files_to_copy: Vec<FileChange> = all_changes.iter()
        .filter(|c| matches!(c.action, ChangeAction::Copy))
        .cloned()
        .collect();

    let files_to_update: Vec<FileChange> = all_changes.iter()
        .filter(|c| matches!(c.action, ChangeAction::Update))
        .cloned()
        .collect();

    let files_to_delete: Vec<FileChange> = all_changes.iter()
        .filter(|c| matches!(c.action, ChangeAction::Delete))
        .cloned()
        .collect();

    let total_files = all_changes.len() as u64;
    let total_size = all_changes.iter().map(|c| c.size).sum();

    Ok(BackupPreview {
        files_to_copy,
        files_to_update,
        files_to_delete,
        total_files,
        total_size,
    })
}

fn parse_dry_run_output(output: &str) -> Result<Vec<FileChange>, String> {
    let mut changes = Vec::new();
    
    for line in output.lines() {
        if line.contains("NOTICE:") && line.contains("would copy") {
            if let Some(path) = extract_file_path_from_notice(line) {
                changes.push(FileChange {
                    path,
                    size: 0, // Size info not always available in dry-run output
                    action: ChangeAction::Copy,
                });
            }
        } else if line.contains("NOTICE:") && line.contains("would update") {
            if let Some(path) = extract_file_path_from_notice(line) {
                changes.push(FileChange {
                    path,
                    size: 0,
                    action: ChangeAction::Update,
                });
            }
        } else if line.contains("NOTICE:") && line.contains("would delete") {
            if let Some(path) = extract_file_path_from_notice(line) {
                changes.push(FileChange {
                    path,
                    size: 0,
                    action: ChangeAction::Delete,
                });
            }
        }
    }
    
    Ok(changes)
}

fn extract_file_path_from_notice(line: &str) -> Option<String> {
    // This is a simplified parser - in reality, rclone output can be complex
    // We'd need more sophisticated parsing for production use
    line.split('"').nth(1).map(|s| s.to_string())
}

#[command]
pub async fn backup_run(profile: Profile, dry_run: bool) -> Result<BackupOperation, String> {
    let operation_id = uuid::Uuid::new_v4().to_string();
    let started_at = Utc::now();
    
    let operation = match profile.mode {
        BackupMode::Copy => "copy",
        BackupMode::Sync => "sync",
    };

    let destination = profile.destination();
    let mut combined_output = String::new();
    let mut total_files = 0u64;
    let mut total_bytes = 0u64;

    for source in &profile.sources {
        // Debug: Check if rclone binary exists
        if !Path::new(&profile.rclone_bin).exists() && profile.rclone_bin != "rclone" {
            return Err(format!("Rclone binary not found at path: {}", profile.rclone_bin));
        }

        // Debug: Check if source directory exists
        if !Path::new(source).exists() {
            return Err(format!("Source directory not found: {}", source));
        }

        // Debug: Check if rclone config exists
        if !Path::new(&profile.rclone_conf).exists() {
            return Err(format!("Rclone config not found at path: {}", profile.rclone_conf));
        }

        let mut args = vec![
            operation.to_string(),
            source.clone(),
            destination.clone(),
            "--config".to_string(),
            profile.rclone_conf.clone(),
            "--progress".to_string(),
            "--stats=1s".to_string(),
            "--stats-one-line".to_string(),
        ];

        if dry_run {
            args.push("--dry-run".to_string());
        }

        // Add custom flags
        for flag in &profile.rclone_flags {
            args.push(flag.clone());
        }

        let output = Command::new(&profile.rclone_bin)
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to execute rclone command '{}' with args {:?}: {}", profile.rclone_bin, args, e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        combined_output.push_str(&format!("=== Source: {} ===\n", source));
        combined_output.push_str(&stdout);
        combined_output.push_str(&stderr);
        combined_output.push_str("\n");

        if !output.status.success() && !dry_run {
            return Ok(BackupOperation {
                id: operation_id,
                profile_id: profile.id,
                operation_type: OperationType::Backup,
                status: OperationStatus::Failed,
                started_at,
                completed_at: Some(Utc::now()),
                files_transferred: total_files,
                bytes_transferred: total_bytes,
                error_message: Some(format!("rclone {} failed for {}: {}", operation, source, stderr)),
                log_output: combined_output,
            });
        }

        // Parse stats from output (simplified)
        // In reality, we'd need more sophisticated parsing
        if let Some((files, bytes)) = parse_rclone_stats(&stderr) {
            total_files += files;
            total_bytes += bytes;
        }
    }

    Ok(BackupOperation {
        id: operation_id,
        profile_id: profile.id,
        operation_type: OperationType::Backup,
        status: OperationStatus::Completed,
        started_at,
        completed_at: Some(Utc::now()),
        files_transferred: total_files,
        bytes_transferred: total_bytes,
        error_message: None,
        log_output: combined_output,
    })
}

#[command]
pub async fn restore_files(profile: Profile, remote_paths: Vec<String>, local_target: String) -> Result<BackupOperation, String> {
    let operation_id = uuid::Uuid::new_v4().to_string();
    let started_at = Utc::now();
    let base_dest = profile.destination();
    let mut combined_output = String::new();
    let mut total_files = 0u64;
    let mut total_bytes = 0u64;

    for remote_path in remote_paths {
        let full_remote_path = format!("{}/{}", base_dest, remote_path.trim_start_matches('/'));
        
        let args = vec![
            "copy".to_string(),
            full_remote_path.clone(),
            local_target.clone(),
            "--config".to_string(),
            profile.rclone_conf.clone(),
            "--progress".to_string(),
            "--stats=1s".to_string(),
            "--stats-one-line".to_string(),
            "--checksum".to_string(),
            "--fast-list".to_string(),
        ];

        let output = Command::new(&profile.rclone_bin)
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        combined_output.push_str(&format!("=== Restoring: {} ===\n", remote_path));
        combined_output.push_str(&stdout);
        combined_output.push_str(&stderr);
        combined_output.push_str("\n");

        if !output.status.success() {
            return Ok(BackupOperation {
                id: operation_id,
                profile_id: profile.id,
                operation_type: OperationType::Restore,
                status: OperationStatus::Failed,
                started_at,
                completed_at: Some(Utc::now()),
                files_transferred: total_files,
                bytes_transferred: total_bytes,
                error_message: Some(format!("restore failed for {}: {}", full_remote_path, stderr)),
                log_output: combined_output,
            });
        }

        if let Some((files, bytes)) = parse_rclone_stats(&stderr) {
            total_files += files;
            total_bytes += bytes;
        }
    }

    Ok(BackupOperation {
        id: operation_id,
        profile_id: profile.id,
        operation_type: OperationType::Restore,
        status: OperationStatus::Completed,
        started_at,
        completed_at: Some(Utc::now()),
        files_transferred: total_files,
        bytes_transferred: total_bytes,
        error_message: None,
        log_output: combined_output,
    })
}

fn parse_rclone_stats(output: &str) -> Option<(u64, u64)> {
    // Simplified stats parsing - would need more robust implementation
    // Look for patterns like "Transferred: 123 files, 456 bytes"
    for line in output.lines() {
        if line.contains("Transferred:") {
            // This is a very basic parser - production would need regex or more sophisticated parsing
            return Some((0, 0)); // Placeholder
        }
    }
    None
}

#[command]
pub async fn get_backup_logs(_profile_id: String, _limit: Option<usize>) -> Result<Vec<BackupOperation>, String> {
    // In a real implementation, we'd store operation logs in a database or file
    // For now, return empty list
    Ok(Vec::new())
}