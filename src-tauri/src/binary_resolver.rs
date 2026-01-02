use std::path::PathBuf;
use tauri::command;

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

        // When bundled in a macOS .app, Tauri v2 places external binaries in MacOS/ directory
        // MyApp.app/Contents/MacOS/my-app (current_exe)
        // MyApp.app/Contents/MacOS/rclone (bundled binary - same directory)
        if let Some(macos_dir) = exe_path.parent() {
            let bundled_path = macos_dir.join("rclone");
            println!("[DEBUG] Checking for bundled rclone at: {:?}", bundled_path);
            if bundled_path.exists() {
                println!("[DEBUG] Found bundled rclone at: {:?}", bundled_path);
                return Ok(bundled_path);
            }
        }

        // Also check Resources/ directory for older Tauri versions
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

/// Command to get the rclone binary path
#[command]
pub async fn get_rclone_path() -> Result<String, String> {
    get_rclone_binary_path().map(|p| p.to_string_lossy().to_string())
}