import type {
  Profile,
  UserSession,
  BackupOperation,
  CloudFile,
  Schedule,
  Employee,
} from '../types';

// ─── Profiles ────────────────────────────────────────────────────────────────

export const mockAdminProfile: Profile = {
  id: 'profile-admin-1',
  name: 'Company Backups',
  profile_type: 'Admin',
  user_id: 'cognito-admin-001',
  rclone_bin: '/usr/local/bin/rclone',
  rclone_conf: '/Users/admin/.config/rclone/rclone.conf',
  remote: 's3',
  bucket: 'acme-backups',
  prefix: '',
  sources: ['/Users/admin/Documents', '/Users/admin/Projects'],
  mode: 'Sync',
  rclone_flags: ['--checksum', '--fast-list'],
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-06-01T14:30:00Z',
};

export const mockUserProfile: Profile = {
  id: 'profile-user-1',
  name: 'My Backup',
  profile_type: 'User',
  user_id: 'cognito-user-001',
  rclone_bin: '/usr/local/bin/rclone',
  rclone_conf: '/Users/jdoe/.config/rclone/rclone.conf',
  remote: 's3',
  bucket: 'acme-backups',
  prefix: 'users/jdoe/',
  sources: ['/Users/jdoe/Documents'],
  mode: 'Copy',
  rclone_flags: [],
  created_at: '2025-03-10T08:00:00Z',
  updated_at: '2025-06-01T14:30:00Z',
};

// ─── Sessions ────────────────────────────────────────────────────────────────

export const mockAdminSession: UserSession = {
  email: 'admin@acme.com',
  userId: 'cognito-admin-001',
  groups: ['Admin', 'Admins'],
  idToken: 'mock-id-token',
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

export const mockUserSession: UserSession = {
  email: 'jdoe@acme.com',
  userId: 'cognito-user-001',
  groups: ['Users'],
  idToken: 'mock-id-token',
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

// ─── Backup Operations ──────────────────────────────────────────────────────

export const mockCompletedBackup: BackupOperation = {
  id: 'op-1',
  profile_id: 'profile-user-1',
  operation_type: 'Backup',
  status: 'Completed',
  started_at: '2025-06-01T02:00:00Z',
  completed_at: '2025-06-01T02:05:30Z',
  files_transferred: 128,
  bytes_transferred: 52_428_800,
  log_output:
    'Transferred:      50 MiB / 50 MiB, 100%, 10 MiB/s\nTransferred:      128 / 128, 100%\nElapsed time:     5m30s\n',
};

export const mockFailedBackup: BackupOperation = {
  id: 'op-2',
  profile_id: 'profile-user-1',
  operation_type: 'Backup',
  status: 'Failed',
  started_at: '2025-05-30T02:00:00Z',
  completed_at: '2025-05-30T02:00:15Z',
  files_transferred: 0,
  bytes_transferred: 0,
  error_message: 'Failed to connect to S3: AccessDenied',
  log_output: 'ERROR: Failed to connect to S3: AccessDenied\n',
};

// ─── Cloud Files ─────────────────────────────────────────────────────────────

export const mockCloudFiles: CloudFile[] = [
  {
    path: 'Documents',
    name: 'Documents',
    size: 0,
    mod_time: '2025-06-01T10:00:00Z',
    is_dir: true,
  },
  {
    path: 'Projects',
    name: 'Projects',
    size: 0,
    mod_time: '2025-05-28T14:00:00Z',
    is_dir: true,
  },
  {
    path: 'report-q2.pdf',
    name: 'report-q2.pdf',
    size: 2_097_152,
    mod_time: '2025-06-01T09:30:00Z',
    is_dir: false,
    mime_type: 'application/pdf',
  },
  {
    path: 'budget.xlsx',
    name: 'budget.xlsx',
    size: 524_288,
    mod_time: '2025-05-20T16:45:00Z',
    is_dir: false,
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    path: 'notes.txt',
    name: 'notes.txt',
    size: 1_024,
    mod_time: '2025-06-01T11:00:00Z',
    is_dir: false,
    mime_type: 'text/plain',
  },
];

// ─── Schedules ───────────────────────────────────────────────────────────────

export const mockDailySchedule: Schedule = {
  enabled: true,
  frequency: 'Daily',
  time: '02:00',
  last_run: '2025-06-01T02:00:00Z',
  next_run: '2025-06-02T02:00:00Z',
};

export const mockWeeklySchedule: Schedule = {
  enabled: true,
  frequency: { Weekly: 1 },
  time: '03:30',
  last_run: '2025-05-26T03:30:00Z',
  next_run: '2025-06-02T03:30:00Z',
};

export const mockDisabledSchedule: Schedule = {
  enabled: false,
  frequency: 'Daily',
  time: '02:00',
};

// ─── Employees ───────────────────────────────────────────────────────────────

export const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Jane Doe',
    username: 'jdoe',
    access_key_id: 'AKIA_MOCK_001',
    secret_access_key: '***',
    rclone_config_generated: true,
    created_at: '2025-01-20T10:00:00Z',
  },
  {
    id: 'emp-2',
    name: 'John Smith',
    username: 'jsmith',
    access_key_id: 'AKIA_MOCK_002',
    secret_access_key: '***',
    rclone_config_generated: false,
    created_at: '2025-03-05T08:00:00Z',
  },
];
