use std::process::Stdio;
use std::path::Path;
use serde_json::Value;
use tauri::command;
use tokio::process::Command;
use chrono::{DateTime, Utc};

use crate::models::*;
use crate::downloader::get_rclone_binary_path;

/// Resolve rclone binary path - use bundled or system rclone
fn resolve_rclone_binary(profile_rclone_bin: &str) -> Result<String, String> {
    // If profile wants bundled or system detection
    if profile_rclone_bin == "bundled" || profile_rclone_bin.contains("bundled") {
        // Use the sidecar function to get the correct path
        if let Ok(bundled_path) = get_rclone_binary_path() {
            return Ok(bundled_path.to_string_lossy().to_string());
        }
        
        // If bundled path fails, fallback to rclone in PATH
        return Ok("rclone".to_string());
    }
    
    // Use the profile's specified binary path
    Ok(profile_rclone_bin.to_string())
}

#[command]
pub async fn detect_rclone() -> Result<Vec<String>, String> {
    let mut candidates = Vec::new();
    
    // First try bundled/system rclone
    if let Ok(rclone_path) = get_rclone_binary_path() {
        let path_str = rclone_path.to_string_lossy().to_string();
        if let Ok(output) = Command::new(&rclone_path)
            .arg("version")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
        {
            if output.status.success() {
                let label = if path_str.contains("Resources/binaries") {
                    "bundled"
                } else {
                    "system"
                };
                candidates.push(format!("{} ({})", path_str, label));
            }
        }
    }
    
    // Then try common system locations for rclone
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
                candidates.push(format!("{} (system)", path));
            }
        }
    }

    // If no rclone found at all, indicate bundled one should work
    if candidates.is_empty() {
        if get_rclone_binary_path().is_ok() {
            candidates.push("bundled rclone available".to_string());
        } else {
            candidates.push("rclone (not found - will need to install or bundle)".to_string());
        }
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
    // For admin users, show all files in the bucket (not restricted to their prefix)
    // For regular users, restrict to their prefix
    let base_target = if matches!(profile.profile_type, crate::models::ProfileType::Admin) {
        // Admin sees the entire bucket
        format!("{}:{}", profile.remote, profile.bucket)
    } else {
        // Regular users see only their prefix
        profile.destination()
    };
    
    let target = if let Some(subpath) = path {
        format!("{}/{}", base_target, subpath.trim_start_matches('/'))
    } else {
        base_target
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

    let rclone_binary = resolve_rclone_binary(&profile.rclone_bin)?;
    let output = Command::new(&rclone_binary)
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
    let operation = match profile.mode {
        BackupMode::Copy => "copy",
        BackupMode::Sync => "sync",
    };

    let destination = profile.destination();
    let mut all_changes = Vec::new();

    for source in &profile.sources {
        let mut args = vec![
            operation.to_string(),
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

        let rclone_binary = resolve_rclone_binary(&profile.rclone_bin)?;
        let output = Command::new(&rclone_binary)
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
        // Resolve the actual rclone binary path
        let rclone_binary = resolve_rclone_binary(&profile.rclone_bin)?;
        
        // Debug: Check if rclone binary exists
        if !Path::new(&rclone_binary).exists() && rclone_binary != "rclone" {
            return Err(format!("Rclone binary not found at path: {}", rclone_binary));
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
            "-v".to_string(), // Verbose mode to log file operations
        ];

        if dry_run {
            args.push("--dry-run".to_string());
        }

        // Add custom flags
        for flag in &profile.rclone_flags {
            args.push(flag.clone());
        }

        let output = Command::new(&rclone_binary)
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to execute rclone command '{}' with args {:?}: {}", rclone_binary, args, e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        println!("[DEBUG] ===== STDOUT for {} =====", source);
        println!("{}", stdout);
        println!("[DEBUG] ===== STDERR for {} =====", source);
        println!("{}", stderr);
        println!("[DEBUG] ===== END OUTPUT =====");

        combined_output.push_str(&format!("=== Source: {} ===\n", source));
        combined_output.push_str(&stdout);
        combined_output.push_str(&stderr);
        combined_output.push_str("\n");

        if !output.status.success() && !dry_run {
            let failed_operation = BackupOperation {
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
            };

            // Save the failed operation to config
            if let Err(e) = crate::config::save_backup_operation(failed_operation.clone()).await {
                eprintln!("Failed to save backup operation: {}", e);
            }

            return Ok(failed_operation);
        }

        // Parse stats from output - rclone outputs to stdout with --stats-one-line and -v
        // Parse both bytes and file count from stdout
        let (files_from_operations, _) = parse_rclone_file_operations(&stdout);
        if let Some((_, bytes)) = parse_rclone_stats(&stdout) {
            println!("[DEBUG] Parsed rclone stats for source {}: {} files, {} bytes", source, files_from_operations, bytes);
            total_files += files_from_operations;
            total_bytes += bytes;
        } else {
            println!("[DEBUG] Could not parse rclone stats from stdout for source: {}", source);
        }
    }

    let operation = BackupOperation {
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
    };

    println!("[DEBUG] Manual backup completed - files: {}, bytes: {}", total_files, total_bytes);

    // Save the operation to config
    if let Err(e) = crate::config::save_backup_operation(operation.clone()).await {
        eprintln!("Failed to save backup operation: {}", e);
    }

    Ok(operation)
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
            "-v".to_string(), // Verbose mode to log file operations
            "--checksum".to_string(),
            "--fast-list".to_string(),
        ];

        let rclone_binary = resolve_rclone_binary(&profile.rclone_bin)?;
        let output = Command::new(&rclone_binary)
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        println!("[DEBUG] ===== STDOUT for restore {} =====", remote_path);
        println!("{}", stdout);
        println!("[DEBUG] ===== STDERR for restore {} =====", remote_path);
        println!("{}", stderr);
        println!("[DEBUG] ===== END OUTPUT =====");

        combined_output.push_str(&format!("=== Restoring: {} ===\n", remote_path));
        combined_output.push_str(&stdout);
        combined_output.push_str(&stderr);
        combined_output.push_str("\n");

        if !output.status.success() {
            let failed_operation = BackupOperation {
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
            };

            // Save the failed operation to config
            if let Err(e) = crate::config::save_backup_operation(failed_operation.clone()).await {
                eprintln!("Failed to save restore operation: {}", e);
            }

            return Ok(failed_operation);
        }

        // Parse stats from output - rclone outputs to stdout with --stats-one-line and -v
        // Parse both bytes and file count from stdout
        let (files_from_operations, _) = parse_rclone_file_operations(&stdout);
        if let Some((_, bytes)) = parse_rclone_stats(&stdout) {
            println!("[DEBUG] Parsed rclone stats for restore {}: {} files, {} bytes", remote_path, files_from_operations, bytes);
            total_files += files_from_operations;
            total_bytes += bytes;
        } else {
            println!("[DEBUG] Could not parse rclone stats from stdout for restore: {}", remote_path);
        }
    }

    let operation = BackupOperation {
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
    };

    println!("[DEBUG] Restore completed - files: {}, bytes: {}", total_files, total_bytes);

    // Save the operation to config
    if let Err(e) = crate::config::save_backup_operation(operation.clone()).await {
        eprintln!("Failed to save restore operation: {}", e);
    }

    Ok(operation)
}

fn parse_rclone_file_operations(output: &str) -> (u64, u64) {
    // Count file operations from rclone output (stdout with -v flag)
    // Rclone outputs messages like:
    // "2025/01/16 12:34:56 INFO  : file.txt: Copied (new)"
    // "2025/01/16 12:34:56 INFO  : file2.txt: Copied (replaced existing)"

    let mut files_copied = 0u64;
    let mut files_deleted = 0u64;

    for line in output.lines() {
        if line.contains("Copied (new)") || line.contains("Copied (replaced existing)") || line.contains("Copied (server-side copy)") {
            files_copied += 1;
        } else if line.contains("Deleted") {
            files_deleted += 1;
        }
    }

    println!("[DEBUG] Parsed file operations from stderr: {} copied, {} deleted", files_copied, files_deleted);
    (files_copied, files_deleted)
}

fn parse_rclone_stats(output: &str) -> Option<(u64, u64)> {
    use regex::Regex;

    // Rclone with --stats-one-line outputs like:
    // "66 B / 66 B, 100%, 0 B/s, ETA -"
    // "1.234 MiB / 2.468 MiB, 50%, 1.5 MiB/s, ETA 1s"
    // Also handle verbose format with "Transferred:" prefix

    let stats_one_line_regex = Regex::new(r"^\s*([0-9.,]+\s*[KMGT]?i?B)\s*/\s*([0-9.,]+\s*[KMGT]?i?B)\s*,\s*(\d+)%").ok()?;
    let transferred_regex = Regex::new(r"Transferred:\s+([0-9.,]+\s*[KMGT]?i?B)\s*/\s*([0-9.,]+\s*[KMGT]?i?B)").ok()?;

    let mut bytes_transferred = 0u64;
    let mut files_transferred = 0u64;

    for line in output.lines() {
        println!("[DEBUG] Parsing line: {}", line);

        // Try stats-one-line format first (most common with current flags)
        if let Some(caps) = stats_one_line_regex.captures(line) {
            let bytes_str = &caps[1];
            if let Ok(bytes) = parse_byte_size(bytes_str) {
                println!("[DEBUG] Parsed byte size from stats-one-line '{}': {} bytes", bytes_str, bytes);
                bytes_transferred = bytes;
            }
        }
        // Try verbose "Transferred:" format
        else if let Some(caps) = transferred_regex.captures(line) {
            let bytes_str = &caps[1];
            if let Ok(bytes) = parse_byte_size(bytes_str) {
                println!("[DEBUG] Parsed byte size from Transferred line '{}': {} bytes", bytes_str, bytes);
                bytes_transferred = bytes;
            }
        }
    }

    // For file count, parse stderr/logs for actual file transfer messages
    // Since --stats-one-line doesn't show file counts, we'll estimate from byte transfers
    // A better approach would be to count "Copied (new)" or similar messages in verbose output

    if bytes_transferred > 0 {
        println!("[DEBUG] Returning stats: files={}, bytes={}", files_transferred, bytes_transferred);
        Some((files_transferred, bytes_transferred))
    } else {
        println!("[DEBUG] No stats found in output");
        None
    }
}

fn parse_byte_size(size_str: &str) -> Result<u64, String> {
    let size_str = size_str.replace(",", "").replace(" ", "");

    if size_str.ends_with("KiB") {
        let num: f64 = size_str.trim_end_matches("KiB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1024.0) as u64)
    } else if size_str.ends_with("KB") {
        let num: f64 = size_str.trim_end_matches("KB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1000.0) as u64)
    } else if size_str.ends_with("MiB") {
        let num: f64 = size_str.trim_end_matches("MiB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1024.0 * 1024.0) as u64)
    } else if size_str.ends_with("MB") {
        let num: f64 = size_str.trim_end_matches("MB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1000.0 * 1000.0) as u64)
    } else if size_str.ends_with("GiB") {
        let num: f64 = size_str.trim_end_matches("GiB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1024.0 * 1024.0 * 1024.0) as u64)
    } else if size_str.ends_with("GB") {
        let num: f64 = size_str.trim_end_matches("GB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1000.0 * 1000.0 * 1000.0) as u64)
    } else if size_str.ends_with("TiB") {
        let num: f64 = size_str.trim_end_matches("TiB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1024.0 * 1024.0 * 1024.0 * 1024.0) as u64)
    } else if size_str.ends_with("TB") {
        let num: f64 = size_str.trim_end_matches("TB").parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
        Ok((num * 1000.0 * 1000.0 * 1000.0 * 1000.0) as u64)
    } else if size_str.ends_with("B") {
        let num: u64 = size_str.trim_end_matches("B").parse().map_err(|e: std::num::ParseIntError| e.to_string())?;
        Ok(num)
    } else {
        size_str.parse::<u64>().map_err(|e| e.to_string())
    }
}

#[command]
pub async fn get_backup_logs(profile_id: String, limit: Option<usize>) -> Result<Vec<BackupOperation>, String> {
    let config = crate::config::load_config().await?;

    println!("[DEBUG] get_backup_logs called for profile_id: {}", profile_id);
    println!("[DEBUG] Total operations in config: {}", config.backup_operations.len());

    // Filter operations for the specific profile and apply limit
    let mut operations: Vec<BackupOperation> = config.backup_operations
        .into_iter()
        .filter(|op| {
            let matches = op.profile_id == profile_id;
            if !matches {
                println!("[DEBUG] Filtering out operation with profile_id: {}", op.profile_id);
            }
            matches
        })
        .collect();

    println!("[DEBUG] Operations after filtering by profile_id: {}", operations.len());

    // Sort by started_at descending (newest first)
    operations.sort_by(|a, b| b.started_at.cmp(&a.started_at));

    // Apply limit if specified
    if let Some(limit) = limit {
        println!("[DEBUG] Applying limit: {}", limit);
        operations.truncate(limit);
    }

    println!("[DEBUG] Returning {} operations", operations.len());
    if !operations.is_empty() {
        println!("[DEBUG] Most recent operation: started_at={:?}, files={}, bytes={}",
            operations[0].started_at, operations[0].files_transferred, operations[0].bytes_transferred);
    }

    Ok(operations)
}