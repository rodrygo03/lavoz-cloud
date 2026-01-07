use std::path::PathBuf;
use tauri::command;

/// Get the path to the rclone binary (bundled with app, brew, or system)
pub fn get_rclone_binary_path() -> Result<PathBuf, String> {
    // First, check the source binaries directory (for development mode)
    // This is where the binaries are located before bundling
    if let Ok(exe_path) = std::env::current_exe() {
        // During development, look relative to the project root
        if let Some(exe_dir) = exe_path.parent() {
            // Try ../binaries/rclone-{arch}-{platform} pattern
            let arch = std::env::consts::ARCH;

            #[cfg(target_os = "macos")]
            let dev_binary_name = format!("rclone-{}-apple-darwin", arch);

            #[cfg(target_os = "windows")]
            let dev_binary_name = format!("rclone-{}-pc-windows-msvc.exe", arch);

            #[cfg(target_os = "linux")]
            let dev_binary_name = format!("rclone-{}-unknown-linux-gnu", arch);

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
                        println!("[DEBUG] Found development rclone binary at: {:?}", canonical);
                        return Ok(canonical);
                    }
                }
            }
        }

        // When bundled, Tauri v2 places external binaries in the same directory as the executable
        // macOS: MyApp.app/Contents/MacOS/rclone (same directory as my-app)
        // Windows: path/to/app/rclone.exe (same directory as app.exe)
        // Linux: path/to/app/rclone (same directory as app)
        if let Some(bin_dir) = exe_path.parent() {
            #[cfg(target_os = "windows")]
            let bundled_path = bin_dir.join("rclone.exe");

            #[cfg(not(target_os = "windows"))]
            let bundled_path = bin_dir.join("rclone");

            println!("[DEBUG] Checking for bundled rclone at: {:?}", bundled_path);
            if bundled_path.exists() {
                println!("[DEBUG] Found bundled rclone at: {:?}", bundled_path);
                return Ok(bundled_path);
            }
        }

        // Also check Resources/ directory for older Tauri versions (macOS only)
        #[cfg(target_os = "macos")]
        if let Some(contents_dir) = exe_path.parent().and_then(|p| p.parent()) {
            let bundled_path = contents_dir.join("Resources").join("rclone");
            if bundled_path.exists() {
                return Ok(bundled_path);
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Check common brew locations (macOS only)
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
    }

    // Fallback to system PATH
    #[cfg(not(target_os = "windows"))]
    {
        let output = std::process::Command::new("which")
            .arg("rclone")
            .output();

        if let Ok(output) = output {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                return Ok(PathBuf::from(path_str));
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("where")
            .arg("rclone")
            .output();

        if let Ok(output) = output {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !path_str.is_empty() {
                    return Ok(PathBuf::from(path_str));
                }
            }
        }
    }

    Err("rclone not found. Please ensure rclone is bundled with the app or install it via Homebrew/Chocolatey.".to_string())
}

/// Command to get the rclone binary path
#[command]
pub async fn get_rclone_path() -> Result<String, String> {
    get_rclone_binary_path().map(|p| p.to_string_lossy().to_string())
}