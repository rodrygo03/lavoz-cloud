use std::path::PathBuf;
use tauri::{command, AppHandle, Emitter};

#[derive(serde::Serialize, Clone)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: Option<u64>,
    pub status: String,
}

/// Check if dependencies are already installed via brew
pub fn are_dependencies_installed() -> Result<bool, String> {
    // Check if brew is installed
    let brew_check = std::process::Command::new("which")
        .arg("brew")
        .output();
    
    if brew_check.is_err() || !brew_check.unwrap().status.success() {
        return Ok(false);
    }
    
    // Check if rclone is installed via brew
    let rclone_check = std::process::Command::new("which")
        .arg("rclone")
        .output();
    
    // Check if aws is installed via brew  
    let aws_check = std::process::Command::new("which")
        .arg("aws")
        .output();
    
    Ok(rclone_check.is_ok() && rclone_check.unwrap().status.success() &&
       aws_check.is_ok() && aws_check.unwrap().status.success())
}


/// Install brew if not present
async fn install_brew(app: &AppHandle) -> Result<(), String> {
    // Check if brew is already installed
    let brew_check = tokio::process::Command::new("which")
        .arg("brew")
        .output()
        .await;
    
    if brew_check.is_ok() && brew_check.unwrap().status.success() {
        // Emit completion immediately if already installed
        if let Err(e) = app.emit("brew-install-progress", &DownloadProgress {
            downloaded: 100,
            total: Some(100),
            status: "Homebrew already installed".to_string(),
        }) {
            eprintln!("Failed to emit brew progress event: {}", e);
        }
        return Ok(());
    }
    
    // Emit start progress
    if let Err(e) = app.emit("brew-install-progress", &DownloadProgress {
        downloaded: 0,
        total: Some(100),
        status: "Starting Homebrew installation...".to_string(),
    }) {
        eprintln!("Failed to emit brew progress event: {}", e);
    }
    
    // Clone app handle for progress updates
    let app_clone = app.clone();
    
    // Start progress simulation in background
    let progress_task = tokio::spawn(async move {
        let progress_steps = vec![
            (10, "Downloading Homebrew installer..."),
            (25, "Setting up installation environment..."),
            (40, "Installing Homebrew core..."),
            (60, "Configuring system paths..."),
            (80, "Finalizing installation..."),
        ];
        
        for (progress, status) in progress_steps {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            if let Err(e) = app_clone.emit("brew-install-progress", &DownloadProgress {
                downloaded: progress,
                total: Some(100),
                status: status.to_string(),
            }) {
                eprintln!("Failed to emit brew progress event: {}", e);
            }
        }
    });
    
    // Install Homebrew using the official installation script
    let output = tokio::process::Command::new("bash")
        .arg("-c")
        .arg(r#"/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)""#)
        .output()
        .await
        .map_err(|e| format!("Failed to install Homebrew: {}", e))?;
    
    // Abort progress task
    progress_task.abort();
    
    if !output.status.success() {
        return Err(format!("Homebrew installation failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // Emit completion
    if let Err(e) = app.emit("brew-install-progress", &DownloadProgress {
        downloaded: 100,
        total: Some(100),
        status: "Homebrew installed successfully".to_string(),
    }) {
        eprintln!("Failed to emit brew progress event: {}", e);
    }
    
    Ok(())
}

/// Install rclone via brew
async fn install_rclone(app: &AppHandle) -> Result<(), String> {
    // Check if rclone is already installed
    let rclone_check = tokio::process::Command::new("which")
        .arg("rclone")
        .output()
        .await;
    
    if rclone_check.is_ok() && rclone_check.unwrap().status.success() {
        // Emit completion immediately if already installed
        if let Err(e) = app.emit("rclone-download-progress", &DownloadProgress {
            downloaded: 100,
            total: Some(100),
            status: "rclone already installed".to_string(),
        }) {
            eprintln!("Failed to emit rclone progress event: {}", e);
        }
        return Ok(());
    }
    
    // Emit start progress
    if let Err(e) = app.emit("rclone-download-progress", &DownloadProgress {
        downloaded: 0,
        total: Some(100),
        status: "Starting rclone installation...".to_string(),
    }) {
        eprintln!("Failed to emit rclone progress event: {}", e);
    }
    
    // Clone app handle for progress updates
    let app_clone = app.clone();
    
    // Start progress simulation in background
    let progress_task = tokio::spawn(async move {
        let progress_steps = vec![
            (20, "Downloading rclone package..."),
            (50, "Installing rclone binary..."),
            (80, "Configuring rclone..."),
        ];
        
        for (progress, status) in progress_steps {
            tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;
            if let Err(e) = app_clone.emit("rclone-download-progress", &DownloadProgress {
                downloaded: progress,
                total: Some(100),
                status: status.to_string(),
            }) {
                eprintln!("Failed to emit rclone progress event: {}", e);
            }
        }
    });
    
    let output = tokio::process::Command::new("brew")
        .args(&["install", "rclone"])
        .output()
        .await
        .map_err(|e| format!("Failed to install rclone: {}", e))?;
    
    // Abort progress task
    progress_task.abort();
    
    if !output.status.success() {
        return Err(format!("rclone installation failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // Emit completion
    if let Err(e) = app.emit("rclone-download-progress", &DownloadProgress {
        downloaded: 100,
        total: Some(100),
        status: "rclone installed successfully".to_string(),
    }) {
        eprintln!("Failed to emit rclone progress event: {}", e);
    }
    
    Ok(())
}

/// Install AWS CLI via brew
async fn install_aws_cli(app: &AppHandle) -> Result<(), String> {
    // Check if AWS CLI is already installed
    let aws_check = tokio::process::Command::new("which")
        .arg("aws")
        .output()
        .await;
    
    if aws_check.is_ok() && aws_check.unwrap().status.success() {
        // Emit completion immediately if already installed
        if let Err(e) = app.emit("aws-download-progress", &DownloadProgress {
            downloaded: 100,
            total: Some(100),
            status: "AWS CLI already installed".to_string(),
        }) {
            eprintln!("Failed to emit AWS progress event: {}", e);
        }
        return Ok(());
    }
    
    // Emit start progress
    if let Err(e) = app.emit("aws-download-progress", &DownloadProgress {
        downloaded: 0,
        total: Some(100),
        status: "Starting AWS CLI installation...".to_string(),
    }) {
        eprintln!("Failed to emit AWS progress event: {}", e);
    }
    
    // Clone app handle for progress updates
    let app_clone = app.clone();
    
    // Start progress simulation in background
    let progress_task = tokio::spawn(async move {
        let progress_steps = vec![
            (20, "Downloading AWS CLI package..."),
            (50, "Installing AWS CLI binary..."),
            (80, "Configuring AWS CLI..."),
        ];
        
        for (progress, status) in progress_steps {
            tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;
            if let Err(e) = app_clone.emit("aws-download-progress", &DownloadProgress {
                downloaded: progress,
                total: Some(100),
                status: status.to_string(),
            }) {
                eprintln!("Failed to emit AWS progress event: {}", e);
            }
        }
    });
    
    let output = tokio::process::Command::new("brew")
        .args(&["install", "awscli"])
        .output()
        .await
        .map_err(|e| format!("Failed to install AWS CLI: {}", e))?;
    
    // Abort progress task
    progress_task.abort();
    
    if !output.status.success() {
        return Err(format!("AWS CLI installation failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // Emit completion
    if let Err(e) = app.emit("aws-download-progress", &DownloadProgress {
        downloaded: 100,
        total: Some(100),
        status: "AWS CLI installed successfully".to_string(),
    }) {
        eprintln!("Failed to emit AWS progress event: {}", e);
    }
    
    Ok(())
}

/// Download and install all dependencies via Homebrew
#[command]
pub async fn download_dependencies(app: AppHandle) -> Result<String, String> {
    // Check if already installed
    if are_dependencies_installed()? {
        return Ok("Dependencies already installed".to_string());
    }
    
    // Emit start event
    if let Err(e) = app.emit("download-start", &()) {
        eprintln!("Failed to emit download-start event: {}", e);
    }
    
    // Install Homebrew if not present
    install_brew(&app).await?;
    
    // Install rclone via brew
    install_rclone(&app).await?;
    
    // Install AWS CLI via brew
    install_aws_cli(&app).await?;
    
    // Emit completion event
    if let Err(e) = app.emit("download-complete", &()) {
        eprintln!("Failed to emit download-complete event: {}", e);
    }
    
    Ok("Dependencies installed via Homebrew: rclone and awscli".to_string())
}

/// Get the path to the rclone binary (bundled with app, brew, or system)
pub fn get_rclone_binary_path() -> Result<PathBuf, String> {
    // First, check the source binaries directory (for development mode)
    // This is where the binaries are located before bundling
    if let Ok(exe_path) = std::env::current_exe() {
        // During development, look relative to the project root
        if let Some(exe_dir) = exe_path.parent() {
            // Try ../binaries/rclone-{arch}-apple-darwin pattern
            let arch = std::env::consts::ARCH;
            let dev_binary_name = format!("rclone-{}-apple-darwin", arch);

            // Look for binaries in project structure
            let possible_paths = vec![
                exe_dir.join("../binaries").join(&dev_binary_name),
                exe_dir.join("../../binaries").join(&dev_binary_name),
                exe_dir.join("../../../binaries").join(&dev_binary_name),
                exe_dir.join("../../../../src-tauri/binaries").join(&dev_binary_name),
            ];

            for path in possible_paths {
                if let Ok(canonical) = path.canonicalize() {
                    if canonical.exists() {
                        return Ok(canonical);
                    }
                }
            }
        }

        // When bundled in a macOS .app, the structure is:
        // MyApp.app/Contents/MacOS/my-app (current_exe)
        // MyApp.app/Contents/Resources/rclone (bundled binary)
        if let Some(contents_dir) = exe_path.parent().and_then(|p| p.parent()) {
            let bundled_path = contents_dir.join("Resources").join("rclone");
            if bundled_path.exists() {
                return Ok(bundled_path);
            }
        }
    }

    // Check common brew locations
    let brew_paths = vec![
        "/opt/homebrew/bin/rclone",    // Apple Silicon
        "/usr/local/bin/rclone",       // Intel Mac
    ];

    for path in brew_paths {
        let path_buf = PathBuf::from(path);
        if path_buf.exists() {
            return Ok(path_buf);
        }
    }

    // Fallback to system PATH
    let output = std::process::Command::new("which")
        .arg("rclone")
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return Ok(PathBuf::from(path_str));
        }
    }

    Err("rclone not found. Please ensure rclone is bundled with the app or install it via Homebrew.".to_string())
}

/// Get the path to the AWS CLI binary (via brew or system)
pub fn get_aws_binary_path() -> Result<PathBuf, String> {
    // Check common brew locations
    let brew_paths = vec![
        "/opt/homebrew/bin/aws",       // Apple Silicon
        "/usr/local/bin/aws",          // Intel Mac
    ];
    
    for path in brew_paths {
        let path_buf = PathBuf::from(path);
        if path_buf.exists() {
            return Ok(path_buf);
        }
    }
    
    // Fallback to system PATH
    let output = std::process::Command::new("which")
        .arg("aws")
        .output();
    
    if let Ok(output) = output {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return Ok(PathBuf::from(path_str));
        }
    }
    
    Err("AWS CLI not found. Please run dependency installation first.".to_string())
}

/// Check if dependencies need to be downloaded
#[command]
pub async fn check_dependencies_needed() -> Result<bool, String> {
    // Since we bundle rclone with the app, we don't need to check for installation
    // Just verify the bundled binary is accessible
    match get_rclone_binary_path() {
        Ok(_) => {
            // Bundled rclone or system rclone found, no download needed
            Ok(false)
        }
        Err(_) => {
            // No bundled binary and no system installation, need download
            Ok(!are_dependencies_installed()?)
        }
    }
}

/// Command to get the rclone binary path
#[command]
pub async fn get_rclone_path() -> Result<String, String> {
    get_rclone_binary_path().map(|p| p.to_string_lossy().to_string())
}

/// Command to get the AWS CLI binary path
#[command]
pub async fn get_aws_path() -> Result<String, String> {
    get_aws_binary_path().map(|p| p.to_string_lossy().to_string())
}