export interface DependencyStatus {
  name: string;
  installed: boolean;
  version?: string;
  install_command: string;
}

export interface Profile {
  id: string;
  name: string;
  profile_type: ProfileType;
  rclone_bin: string;
  rclone_conf: string;
  remote: string;
  bucket: string;
  prefix: string;
  sources: string[];
  mode: BackupMode;
  schedule?: Schedule;
  rclone_flags: string[];
  aws_config?: AwsConfig;
  created_at: string;
  updated_at: string;
}

export type ProfileType = 'Admin' | 'User';

export interface AwsConfig {
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_region: string;
  aws_sso_configured: boolean;
  bucket_name: string;
  lifecycle_config: LifecycleConfig;
  employees: Employee[];
}

export interface LifecycleConfig {
  enabled: boolean;
  days_to_ia: number;
  days_to_glacier: number;
}

export interface Employee {
  id: string;
  name: string;
  username: string;
  access_key_id: string;
  secret_access_key: string;
  rclone_config_generated: boolean;
  created_at: string;
}

export type BackupMode = 'Copy' | 'Sync';

export interface Schedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time: string;
  last_run?: string;
  next_run?: string;
}

export type ScheduleFrequency = 
  | { Daily: null }
  | { Weekly: number }
  | { Monthly: number };

export interface CloudFile {
  path: string;
  name: string;
  size: number;
  mod_time: string;
  is_dir: boolean;
  mime_type?: string;
}

export interface BackupOperation {
  id: string;
  profile_id: string;
  operation_type: OperationType;
  status: OperationStatus;
  started_at: string;
  completed_at?: string;
  files_transferred: number;
  bytes_transferred: number;
  error_message?: string;
  log_output: string;
}

export type OperationType = 'Backup' | 'Restore' | 'Preview';
export type OperationStatus = 'Running' | 'Completed' | 'Failed' | 'Cancelled';

export interface BackupPreview {
  files_to_copy: FileChange[];
  files_to_update: FileChange[];
  files_to_delete: FileChange[];
  total_files: number;
  total_size: number;
}

export interface FileChange {
  path: string;
  size: number;
  action: ChangeAction;
}

export type ChangeAction = 'Copy' | 'Update' | 'Delete';

export interface RcloneOutput {
  stdout: string;
  stderr: string;
  success: boolean;
  exit_code: number;
}