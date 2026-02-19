/**
 * Mock for @tauri-apps/api/core — used in Storybook where Tauri IPC is unavailable.
 *
 * Each `invoke` command returns a sensible default so components render without crashing.
 * Add new command names here as you write stories that exercise them.
 */

import type { Profile, BackupOperation, CloudFile, Schedule } from '../types';

// Default responses keyed by Tauri command name
const commandDefaults: Record<string, unknown> = {
  // config.rs
  get_or_create_user_profile: {
    id: 'mock-profile-1',
    name: 'Mock Profile',
    profile_type: 'User',
    rclone_bin: '/usr/local/bin/rclone',
    rclone_conf: '~/.config/rclone/rclone.conf',
    remote: 's3',
    bucket: 'my-bucket',
    prefix: 'backups/',
    sources: ['/Users/me/Documents'],
    mode: 'Copy',
    rclone_flags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies Profile,

  list_profiles: [] as Profile[],
  update_profile: undefined,
  delete_profile: undefined,

  // rclone / backup
  backup_run: {
    id: 'op-1',
    profile_id: 'mock-profile-1',
    operation_type: 'Backup',
    status: 'Completed',
    started_at: new Date().toISOString(),
    files_transferred: 42,
    bytes_transferred: 1_048_576,
    log_output: 'Transferred: 42 files, 1 MiB\n',
  } satisfies Partial<BackupOperation>,

  backup_preview: {
    files_to_copy: [],
    files_to_update: [],
    files_to_delete: [],
    total_files: 0,
    total_size: 0,
  },

  get_backup_logs: [] as BackupOperation[],
  sync_scheduled_backup_logs: 0,

  // cloud browser
  list_cloud_files: [] as CloudFile[],
  restore_files: {
    id: 'op-2',
    profile_id: 'mock-profile-1',
    operation_type: 'Restore',
    status: 'Completed',
    started_at: new Date().toISOString(),
    files_transferred: 1,
    bytes_transferred: 512,
    log_output: 'Restored 1 file\n',
  } satisfies Partial<BackupOperation>,

  // schedule
  get_schedule_status: null as Schedule | null,
  schedule_backup: undefined,
  unschedule_backup: undefined,

  // rclone auto setup
  auto_setup_rclone_complete: undefined,
};

/**
 * Mock `invoke` — returns the default for the given command, or `undefined`.
 * Stories can override behaviour by providing their own module mock via
 * parameters or by mutating `commandDefaults` before rendering.
 */
export async function invoke<T = unknown>(cmd: string, _args?: Record<string, unknown>): Promise<T> {
  console.log(`[mock] invoke("${cmd}")`, _args);

  if (cmd in commandDefaults) {
    // Return a deep-ish clone so mutations in one story don't leak to others
    const val = commandDefaults[cmd];
    return (val === undefined || val === null ? val : JSON.parse(JSON.stringify(val))) as T;
  }

  console.warn(`[mock] No default for invoke("${cmd}") — returning undefined`);
  return undefined as T;
}

// Re-export everything the real module exposes so wildcard imports don't break
export const convertFileSrc = (path: string) => path;
export const transformCallback = () => 0;
