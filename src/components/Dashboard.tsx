import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { 
  Play, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  Activity,
  Settings as SettingsIcon
} from 'lucide-react';
import { Profile, BackupOperation, BackupPreview, Schedule } from '../types';

interface DashboardProps {
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export default function Dashboard({ profile }: DashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lastBackup, setLastBackup] = useState<BackupOperation | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [logs, setLogs] = useState<string>('');

  useEffect(() => {
    if (profile) {
      loadDashboardData();
    }
  }, [profile]);

  // Reload data whenever Dashboard component mounts or becomes the active route
  useEffect(() => {
    if (profile) {
      console.log('Dashboard component mounted/activated, loading data...');
      loadDashboardData();
    }
  }, []); // Run on every mount

  // Also reload when profile changes
  useEffect(() => {
    if (profile) {
      console.log('Profile changed, reloading dashboard data...');
      loadDashboardData();
    }
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      // Sync any scheduled backup logs first
      console.log('Syncing scheduled backup logs...');
      const syncedCount = await invoke<number>('sync_scheduled_backup_logs', {
        profileId: profile.id
      });
      console.log('Synced', syncedCount, 'backup operations');

      // Load backup logs
      console.log('Loading backup logs...');
      const operations = await invoke<BackupOperation[]>('get_backup_logs', {
        profileId: profile.id,
        limit: 1
      });
      console.log('Retrieved operations:', operations);
      if (operations.length > 0) {
        console.log('Setting last backup to:', operations[0]);
        console.log('Operation type:', operations[0].operation_type);
        console.log('Started at:', operations[0].started_at);
        console.log('Log output preview:', operations[0].log_output.substring(0, 100));
        setLastBackup(operations[0]);
      } else {
        console.log('No operations found');
      }

      // Load schedule status
      const scheduleStatus = await invoke<Schedule | null>('get_schedule_status', {
        profileId: profile.id
      });
      console.log('Dashboard loaded schedule:', scheduleStatus);
      setSchedule(scheduleStatus);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const runBackup = async () => {
    if (!profile || isRunning) return;

    console.log(`Starting backup for profile: ${profile.name}`);
    setIsRunning(true);
    setLogs('Starting backup...\n');
    
    try {
      console.log('Invoking backup_run command');
      const operation = await invoke<BackupOperation>('backup_run', {
        profile,
        dryRun: false
      });
      
      console.log('Backup operation result:', operation);
      setLastBackup(operation);
      setLogs(operation.log_output);
      
      if (operation.status === 'Completed') {
        console.log('Backup completed successfully');
        alert('Backup completed successfully!');
      } else if (operation.status === 'Failed') {
        console.error('Backup failed:', operation.error_message);
        alert(`Backup failed: ${operation.error_message}`);
      }
    } catch (error) {
      console.error('Backup failed:', error);
      setLogs(prev => prev + `\nError: ${error}\n`);
      alert('Backup failed: ' + error);
    } finally {
      setIsRunning(false);
    }
  };

  const runPreview = async () => {
    if (!profile) return;

    console.log(`Starting preview for profile: ${profile.name}`);
    try {
      console.log('Invoking backup_preview command');
      const previewResult = await invoke<BackupPreview>('backup_preview', {
        profile
      });
      console.log('Preview result:', previewResult);
      setPreview(previewResult);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Preview failed: ' + error);
    }
  };

  const confirmAndRunSync = async () => {
    if (!profile || !preview) return;

    const hasDeletes = preview.files_to_delete.length > 0;
    
    if (hasDeletes) {
      const confirmed = confirm(
        t('dashboard.syncDeleteConfirmation', { 
          count: preview.files_to_delete.length,
          defaultValue: `This sync operation will delete ${preview.files_to_delete.length} files from the cloud. Are you sure you want to continue?`
        })
      );
      if (!confirmed) return;
    }

    setShowPreview(false);
    await runBackup();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  if (!profile) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <Activity size={48} />
          <h2>{t('dashboard.noProfileSelected')}</h2>
          <p>{t('dashboard.selectProfile')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{t('dashboard.title')}</h1>
        <div className="profile-info">
          <span className="profile-name">{profile.name}</span>
          <span className="profile-destination">
            {profile.remote}:{profile.bucket}/{profile.prefix}
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Backup Actions */}
        <div className="card">
          <div className="card-header">
            <h3>{t('dashboard.backupActions')}</h3>
          </div>
          <div className="card-content">
            <div className="action-buttons">
              <button 
                className="btn btn-primary btn-large"
                onClick={runBackup}
                disabled={isRunning}
              >
                <Play size={20} />
                {isRunning ? t('dashboard.runningBackup') : t('dashboard.runBackupNow')}
              </button>

              {profile.mode === 'Sync' && (
                <button 
                  className="btn btn-secondary"
                  onClick={runPreview}
                  disabled={isRunning}
                >
                  <Eye size={16} />
                  {t('dashboard.previewChanges')}
                </button>
              )}
            </div>

            <div className="backup-info">
              <div className="info-item">
                <span className="label">{t('dashboard.mode')}:</span>
                <span className={`value mode-${profile.mode.toLowerCase()}`}>
                  {profile.mode}
                </span>
              </div>
              <div className="info-item">
                <span className="label">{t('dashboard.sources')}:</span>
                <span className="value">{profile.sources.length} {t('dashboard.folders')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Backup Status */}
        <div className="card">
          <div className="card-header">
            <h3>{t('dashboard.lastBackup')}</h3>
          </div>
          <div className="card-content">
            {lastBackup ? (
              <div className="backup-status">
                <div className="status-header">
                  <div className={`status-indicator ${lastBackup.status.toLowerCase()}`}>
                    {lastBackup.status === 'Completed' && <CheckCircle size={20} />}
                    {lastBackup.status === 'Failed' && <AlertTriangle size={20} />}
                    {lastBackup.status === 'Running' && <Clock size={20} />}
                    <span>
                      {lastBackup.status === 'Completed' && t('dashboard.statusCompleted')}
                      {lastBackup.status === 'Failed' && t('dashboard.statusFailed')}
                      {lastBackup.status === 'Running' && t('dashboard.statusRunning')}
                    </span>
                  </div>
                  <span className="backup-date">
                    {formatDate(lastBackup.started_at)}
                  </span>
                </div>

                <div className="backup-stats">
                  <div className="stat">
                    <span className="stat-value">{lastBackup.files_transferred}</span>
                    <span className="stat-label">{t('dashboard.files')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatBytes(lastBackup.bytes_transferred)}</span>
                    <span className="stat-label">{t('dashboard.data')}</span>
                  </div>
                </div>

                {lastBackup.error_message && (
                  <div className="error-message">
                    {lastBackup.error_message}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state-small">
                <Clock size={24} />
                <p>{t('dashboard.noBackupsYet')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Status */}
        <div className="card">
          <div className="card-header">
            <h3>{t('dashboard.schedule')}</h3>
          </div>
          <div className="card-content">
            {schedule && schedule.enabled ? (
              <div className="schedule-info">
                <div className="schedule-status enabled">
                  <Calendar size={16} />
                  <span>{t('dashboard.scheduled')}</span>
                </div>
                <div className="schedule-details">
                  <div className="schedule-frequency">
                    {/* Format schedule frequency based on type */}
                    {typeof schedule.frequency === 'object' && 'Daily' in schedule.frequency && 'Daily'}
                    {typeof schedule.frequency === 'object' && 'Weekly' in schedule.frequency && 
                      `Weekly (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][schedule.frequency.Weekly]})`}
                    {typeof schedule.frequency === 'object' && 'Monthly' in schedule.frequency && 
                      `Monthly (${schedule.frequency.Monthly}th)`}
                  </div>
                  <div className="schedule-time">at {formatTime12Hour(schedule.time)}</div>
                </div>
                {schedule.next_run && (
                  <div className="next-run">
                    {t('dashboard.nextRun')}: {formatDate(schedule.next_run)}
                  </div>
                )}
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => navigate('/settings?tab=schedule')}
                >
                  <SettingsIcon size={14} />
                  {t('dashboard.changeSchedule')}
                </button>
              </div>
            ) : (
              <div className="empty-state-small">
                <Calendar size={24} />
                <p>{t('dashboard.noScheduleConfigured')}</p>
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => navigate('/settings?tab=schedule')}
                >
                  <SettingsIcon size={14} />
                  {t('dashboard.setSchedule')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="card full-width">
          <div className="card-header">
            <h3>{t('dashboard.recentLogs')}</h3>
            <button className="btn-icon">
              <FileText size={16} />
            </button>
          </div>
          <div className="card-content">
            {logs || lastBackup?.log_output ? (
              <pre className="logs-content">{logs || lastBackup?.log_output}</pre>
            ) : (
              <div className="empty-state-small">
                <FileText size={24} />
                <p>{t('dashboard.noLogsAvailable')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && preview && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{t('dashboard.syncPreview', { defaultValue: 'Sync Preview' })}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="preview-summary">
                <div className="summary-item">
                  <span className="count">{preview.files_to_copy.length}</span>
                  <span className="label">{t('dashboard.filesToCopy', { defaultValue: 'Files to copy' })}</span>
                </div>
                <div className="summary-item">
                  <span className="count">{preview.files_to_update.length}</span>
                  <span className="label">{t('dashboard.filesToUpdate', { defaultValue: 'Files to update' })}</span>
                </div>
                <div className="summary-item danger">
                  <span className="count">{preview.files_to_delete.length}</span>
                  <span className="label">{t('dashboard.filesToDelete', { defaultValue: 'Files to delete' })}</span>
                </div>
              </div>

              {preview.files_to_delete.length > 0 && (
                <div className="warning-box">
                  <AlertTriangle size={16} />
                  <div>
                    <strong>{t('dashboard.warning', { defaultValue: 'Warning' })}:</strong> {t('dashboard.deleteWarning', { count: preview.files_to_delete.length, defaultValue: `This operation will delete ${preview.files_to_delete.length} files from the cloud. This action cannot be undone.` })}
                  </div>
                </div>
              )}

              <div className="preview-details">
                {preview.files_to_delete.length > 0 && (
                  <div className="file-changes">
                    <h4>{t('dashboard.filesToDeleteList', { defaultValue: 'Files to delete:' })}</h4>
                    <div className="file-list">
                      {preview.files_to_delete.slice(0, 10).map((file, index) => (
                        <div key={index} className="file-item danger">
                          {file.path}
                        </div>
                      ))}
                      {preview.files_to_delete.length > 10 && (
                        <div className="file-item">
                          {t('dashboard.andMore', { count: preview.files_to_delete.length - 10, defaultValue: `... and ${preview.files_to_delete.length - 10} more` })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowPreview(false)}
              >
                {t('common.cancel')}
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmAndRunSync}
                disabled={isRunning}
              >
                {isRunning ? t('dashboard.running', { defaultValue: 'Running...' }) : t('dashboard.confirmAndRunSync', { defaultValue: 'Confirm & Run Sync' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}