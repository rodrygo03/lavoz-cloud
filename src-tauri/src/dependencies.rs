use std::process::Stdio;
use tauri::command;
use tokio::process::Command;
use crate::models::DependencyStatus;

#[command]
pub async fn check_dependencies() -> Result<Vec<DependencyStatus>, String> {
    let mut dependencies = Vec::new();
    
    // Check AWS CLI
    let aws_status = check_aws_cli().await;
    dependencies.push(aws_status);
    
    // Check rclone
    let rclone_status = check_rclone_dependency().await;
    dependencies.push(rclone_status);
    
    Ok(dependencies)
}

async fn check_aws_cli() -> DependencyStatus {
    let output = Command::new("aws")
        .args(&["--version"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await;
    
    match output {
        Ok(output) if output.status.success() => {
            let version_str = String::from_utf8_lossy(&output.stdout);
            let version = version_str.lines().next().map(|s| s.to_string());
            DependencyStatus {
                name: "AWS CLI".to_string(),
                installed: true,
                version,
                install_command: get_aws_cli_install_command(),
            }
        }
        _ => DependencyStatus {
            name: "AWS CLI".to_string(),
            installed: false,
            version: None,
            install_command: get_aws_cli_install_command(),
        }
    }
}

async fn check_rclone_dependency() -> DependencyStatus {
    let output = Command::new("rclone")
        .args(&["version"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await;
    
    match output {
        Ok(output) if output.status.success() => {
            let version_str = String::from_utf8_lossy(&output.stdout);
            let version = version_str.lines().next().map(|s| s.to_string());
            DependencyStatus {
                name: "rclone".to_string(),
                installed: true,
                version,
                install_command: get_rclone_install_command(),
            }
        }
        _ => DependencyStatus {
            name: "rclone".to_string(),
            installed: false,
            version: None,
            install_command: get_rclone_install_command(),
        }
    }
}

#[command]
pub async fn install_dependency(dependency_name: String) -> Result<String, String> {
    match dependency_name.as_str() {
        "AWS CLI" => install_aws_cli().await,
        "rclone" => install_rclone().await,
        _ => Err(format!("Unknown dependency: {}", dependency_name)),
    }
}

async fn install_aws_cli() -> Result<String, String> {
    let install_command = get_aws_cli_install_command();
    
    if cfg!(target_os = "windows") {
        // Windows: Use winget or direct download
        let output = Command::new("winget")
            .args(&["install", "--id=Amazon.AWSCLI"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await;
        
        match output {
            Ok(output) if output.status.success() => {
                Ok("AWS CLI installed successfully via winget".to_string())
            }
            _ => {
                // Fallback to MSI download method
                install_aws_cli_windows_msi().await
            }
        }
    } else if cfg!(target_os = "macos") {
        // macOS: Try Homebrew first, then fallback to pkg installer
        let output = Command::new("brew")
            .args(&["install", "awscli"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await;
        
        match output {
            Ok(output) if output.status.success() => {
                Ok("AWS CLI installed successfully via Homebrew".to_string())
            }
            _ => {
                // Fallback to pkg installer
                install_aws_cli_macos_pkg().await
            }
        }
    } else {
        // Linux: Use package manager detection
        install_aws_cli_linux().await
    }
}

async fn install_rclone() -> Result<String, String> {
    if cfg!(target_os = "windows") {
        // Windows: Use chocolatey or direct download
        let output = Command::new("choco")
            .args(&["install", "rclone"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await;
        
        match output {
            Ok(output) if output.status.success() => {
                Ok("rclone installed successfully via Chocolatey".to_string())
            }
            _ => {
                install_rclone_direct_download().await
            }
        }
    } else if cfg!(target_os = "macos") {
        // macOS: Try Homebrew first
        let output = Command::new("brew")
            .args(&["install", "rclone"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await;
        
        match output {
            Ok(output) if output.status.success() => {
                Ok("rclone installed successfully via Homebrew".to_string())
            }
            _ => {
                install_rclone_direct_download().await
            }
        }
    } else {
        // Linux: Use package manager or direct download
        install_rclone_linux().await
    }
}

async fn install_aws_cli_windows_msi() -> Result<String, String> {
    // Download and install AWS CLI MSI for Windows
    let download_url = "https://awscli.amazonaws.com/AWSCLIV2.msi";
    let temp_path = std::env::temp_dir().join("AWSCLIV2.msi");
    
    // Download the MSI file
    let output = Command::new("powershell")
        .args(&[
            "-Command",
            &format!("Invoke-WebRequest -Uri '{}' -OutFile '{}'", download_url, temp_path.display())
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to download AWS CLI: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("Failed to download AWS CLI MSI: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // Install the MSI
    let install_output = Command::new("msiexec")
        .args(&["/i", &temp_path.to_string_lossy(), "/quiet"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to install AWS CLI: {}", e))?;
    
    if install_output.status.success() {
        Ok("AWS CLI installed successfully via MSI".to_string())
    } else {
        Err(format!("AWS CLI installation failed: {}", String::from_utf8_lossy(&install_output.stderr)))
    }
}

async fn install_aws_cli_macos_pkg() -> Result<String, String> {
    // Download and install AWS CLI PKG for macOS
    let download_url = "https://awscli.amazonaws.com/AWSCLIV2.pkg";
    let temp_path = "/tmp/AWSCLIV2.pkg";
    
    // Download the PKG file
    let output = Command::new("curl")
        .args(&["-o", temp_path, download_url])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to download AWS CLI: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("Failed to download AWS CLI PKG: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // Install the PKG
    let install_output = Command::new("sudo")
        .args(&["installer", "-pkg", temp_path, "-target", "/"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to install AWS CLI: {}", e))?;
    
    if install_output.status.success() {
        Ok("AWS CLI installed successfully via PKG".to_string())
    } else {
        Err(format!("AWS CLI installation failed: {}", String::from_utf8_lossy(&install_output.stderr)))
    }
}

async fn install_aws_cli_linux() -> Result<String, String> {
    // Try different package managers for Linux
    
    // Try apt (Debian/Ubuntu)
    if let Ok(output) = Command::new("which").arg("apt").output().await {
        if output.status.success() {
            let install_output = Command::new("sudo")
                .args(&["apt", "update", "&&", "sudo", "apt", "install", "-y", "awscli"])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .await;
            
            if let Ok(output) = install_output {
                if output.status.success() {
                    return Ok("AWS CLI installed successfully via apt".to_string());
                }
            }
        }
    }
    
    // Try yum (RHEL/CentOS)
    if let Ok(output) = Command::new("which").arg("yum").output().await {
        if output.status.success() {
            let install_output = Command::new("sudo")
                .args(&["yum", "install", "-y", "awscli"])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .await;
            
            if let Ok(output) = install_output {
                if output.status.success() {
                    return Ok("AWS CLI installed successfully via yum".to_string());
                }
            }
        }
    }
    
    // Fallback to direct download and install
    install_aws_cli_linux_direct().await
}

async fn install_aws_cli_linux_direct() -> Result<String, String> {
    // Direct download and install for Linux
    let temp_dir = "/tmp/aws-cli-install";
    
    // Create temp directory
    let _ = Command::new("mkdir").args(&["-p", temp_dir]).output().await;
    
    // Download and extract
    let download_output = Command::new("curl")
        .args(&["https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip", "-o", &format!("{}/awscliv2.zip", temp_dir)])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await;
    
    if let Ok(output) = download_output {
        if output.status.success() {
            // Extract and install
            let unzip_output = Command::new("unzip")
                .args(&[&format!("{}/awscliv2.zip", temp_dir), "-d", temp_dir])
                .output()
                .await;
            
            if let Ok(_) = unzip_output {
                let install_output = Command::new("sudo")
                    .args(&[&format!("{}/aws/install", temp_dir)])
                    .output()
                    .await;
                
                if let Ok(output) = install_output {
                    if output.status.success() {
                        return Ok("AWS CLI installed successfully via direct download".to_string());
                    }
                }
            }
        }
    }
    
    Err("Failed to install AWS CLI via direct download".to_string())
}

async fn install_rclone_direct_download() -> Result<String, String> {
    // Cross-platform rclone installation script
    let install_script = if cfg!(target_os = "windows") {
        "powershell -Command \"iex (iwr 'https://rclone.org/install.ps1').Content\""
    } else {
        "curl https://rclone.org/install.sh | sudo bash"
    };
    
    let output = if cfg!(target_os = "windows") {
        Command::new("powershell")
            .args(&["-Command", "iex (iwr 'https://rclone.org/install.ps1').Content"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
    } else {
        Command::new("sh")
            .args(&["-c", "curl https://rclone.org/install.sh | sudo bash"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
    };
    
    match output {
        Ok(output) if output.status.success() => {
            Ok("rclone installed successfully via official installer".to_string())
        }
        Ok(output) => {
            Err(format!("rclone installation failed: {}", String::from_utf8_lossy(&output.stderr)))
        }
        Err(e) => {
            Err(format!("Failed to run rclone installer: {}", e))
        }
    }
}

async fn install_rclone_linux() -> Result<String, String> {
    // Try package managers first, then fallback to direct download
    
    // Try apt
    if let Ok(output) = Command::new("which").arg("apt").output().await {
        if output.status.success() {
            let install_output = Command::new("sudo")
                .args(&["apt", "install", "-y", "rclone"])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .await;
            
            if let Ok(output) = install_output {
                if output.status.success() {
                    return Ok("rclone installed successfully via apt".to_string());
                }
            }
        }
    }
    
    // Try yum
    if let Ok(output) = Command::new("which").arg("yum").output().await {
        if output.status.success() {
            let install_output = Command::new("sudo")
                .args(&["yum", "install", "-y", "rclone"])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .await;
            
            if let Ok(output) = install_output {
                if output.status.success() {
                    return Ok("rclone installed successfully via yum".to_string());
                }
            }
        }
    }
    
    // Fallback to direct download
    install_rclone_direct_download().await
}

fn get_aws_cli_install_command() -> String {
    if cfg!(target_os = "windows") {
        "winget install --id=Amazon.AWSCLI".to_string()
    } else if cfg!(target_os = "macos") {
        "brew install awscli".to_string()
    } else {
        "curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip' && unzip awscliv2.zip && sudo ./aws/install".to_string()
    }
}

fn get_rclone_install_command() -> String {
    if cfg!(target_os = "windows") {
        "choco install rclone".to_string()
    } else if cfg!(target_os = "macos") {
        "brew install rclone".to_string()
    } else {
        "curl https://rclone.org/install.sh | sudo bash".to_string()
    }
}