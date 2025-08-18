use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DependencyStatus {
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub install_command: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub profile_type: ProfileType,
    pub rclone_bin: String,
    pub rclone_conf: String,
    pub remote: String,
    pub bucket: String,
    pub prefix: String,
    pub sources: Vec<String>,
    pub mode: BackupMode,
    pub schedule: Option<Schedule>,
    pub rclone_flags: Vec<String>,
    pub aws_config: Option<AwsConfig>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ProfileType {
    Admin,
    User,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AwsConfig {
    pub aws_access_key_id: String,
    pub aws_secret_access_key: String,
    pub aws_region: String,
    pub aws_sso_configured: bool,
    pub bucket_name: String,
    pub lifecycle_config: LifecycleConfig,
    pub employees: Vec<Employee>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LifecycleConfig {
    pub enabled: bool,
    pub days_to_ia: u32,
    pub days_to_glacier: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Employee {
    pub id: String,
    pub name: String,
    pub username: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub rclone_config_generated: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum BackupMode {
    Copy,
    Sync,
}

impl Default for BackupMode {
    fn default() -> Self {
        BackupMode::Copy
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Schedule {
    pub enabled: bool,
    pub frequency: ScheduleFrequency,
    pub time: String, // HH:MM format
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum ScheduleFrequency {
    Daily,
    Weekly(u8), // 0 = Sunday, 1 = Monday, etc.
    Monthly(u8), // Day of month
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CloudFile {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub mod_time: DateTime<Utc>,
    pub is_dir: bool,
    pub mime_type: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BackupOperation {
    pub id: String,
    pub profile_id: String,
    pub operation_type: OperationType,
    pub status: OperationStatus,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub files_transferred: u64,
    pub bytes_transferred: u64,
    pub error_message: Option<String>,
    pub log_output: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum OperationType {
    Backup,
    Restore,
    Preview,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum OperationStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BackupPreview {
    pub files_to_copy: Vec<FileChange>,
    pub files_to_update: Vec<FileChange>,
    pub files_to_delete: Vec<FileChange>,
    pub total_files: u64,
    pub total_size: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileChange {
    pub path: String,
    pub size: u64,
    pub action: ChangeAction,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum ChangeAction {
    Copy,
    Update,
    Delete,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub profiles: Vec<Profile>,
    pub active_profile_id: Option<String>,
    pub app_version: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Default for AppConfig {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            profiles: Vec::new(),
            active_profile_id: None,
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            created_at: now,
            updated_at: now,
        }
    }
}

impl Profile {
    pub fn new(name: String, profile_type: ProfileType) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            profile_type,
            rclone_bin: String::new(),
            rclone_conf: String::new(),
            remote: "aws".to_string(),
            bucket: String::new(),
            prefix: String::new(),
            sources: Vec::new(),
            mode: BackupMode::default(),
            schedule: None,
            rclone_flags: vec![
                "--checksum".to_string(),
                "--fast-list".to_string(),
                "--transfers=8".to_string(),
                "--checkers=32".to_string(),
            ],
            aws_config: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn destination(&self) -> String {
        if self.prefix.is_empty() {
            format!("{}:{}", self.remote, self.bucket)
        } else {
            format!("{}:{}/{}", self.remote, self.bucket, self.prefix)
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RcloneOutput {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
    pub exit_code: i32,
}