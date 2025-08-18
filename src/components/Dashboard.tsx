import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Play, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  Activity
} from 'lucide-react';
import { Profile, BackupOperation, BackupPreview, Schedule } from '../types';

interface DashboardProps {
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export default function Dashboard({ profile }: DashboardProps) {
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

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      // Load backup logs
      const operations = await invoke<BackupOperation[]>('get_backup_logs', {
        profileId: profile.id,
        limit: 1
      });
      if (operations.length > 0) {
        setLastBackup(operations[0]);
      }

      // Load schedule status
      const scheduleStatus = await invoke<Schedule | null>('get_schedule_status', {
        profileId: profile.id
      });
      setSchedule(scheduleStatus);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const runBackup = async () => {
    if (!profile || isRunning) return;

    setIsRunning(true);
    try {
      const operation = await invoke<BackupOperation>('backup_run', {
        profile,
        dryRun: false
      });
      
      setLastBackup(operation);
      setLogs(operation.log_output);
      
      if (operation.status === 'Failed') {
        alert(`Backup failed: ${operation.error_message}`);
      }
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Backup failed: ' + error);
    } finally {
      setIsRunning(false);
    }
  };

  const runPreview = async () => {
    if (!profile) return;

    try {
      const previewResult = await invoke<BackupPreview>('backup_preview', {
        profile
      });
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
        `This sync operation will delete ${preview.files_to_delete.length} files from the cloud. ` +
        'Are you sure you want to continue?'
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

  if (!profile) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <Activity size={48} />
          <h2>No Profile Selected</h2>
          <p>Select a profile from the sidebar to view the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
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
            <h3>Backup Actions</h3>
          </div>
          <div className="card-content">
            <div className="action-buttons">
              <button 
                className="btn btn-primary btn-large"
                onClick={runBackup}
                disabled={isRunning}
              >
                <Play size={20} />
                {isRunning ? 'Running Backup...' : 'Run Backup Now'}
              </button>

              {profile.mode === 'Sync' && (
                <button 
                  className="btn btn-secondary"
                  onClick={runPreview}
                  disabled={isRunning}
                >
                  <Eye size={16} />
                  Preview Changes
                </button>
              )}
            </div>

            <div className="backup-info">
              <div className="info-item">
                <span className="label">Mode:</span>
                <span className={`value mode-${profile.mode.toLowerCase()}`}>
                  {profile.mode}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Sources:</span>
                <span className="value">{profile.sources.length} folder(s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Backup Status */}
        <div className="card">
          <div className="card-header">
            <h3>Last Backup</h3>
          </div>
          <div className="card-content">
            {lastBackup ? (
              <div className="backup-status">
                <div className="status-header">
                  <div className={`status-indicator ${lastBackup.status.toLowerCase()}`}>
                    {lastBackup.status === 'Completed' && <CheckCircle size={20} />}
                    {lastBackup.status === 'Failed' && <AlertTriangle size={20} />}
                    {lastBackup.status === 'Running' && <Clock size={20} />}
                    <span>{lastBackup.status}</span>
                  </div>
                  <span className="backup-date">
                    {formatDate(lastBackup.started_at)}
                  </span>
                </div>

                <div className="backup-stats">
                  <div className="stat">
                    <span className="stat-value">{lastBackup.files_transferred}</span>
                    <span className="stat-label">Files</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatBytes(lastBackup.bytes_transferred)}</span>
                    <span className="stat-label">Data</span>
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
                <p>No backups run yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Status */}
        <div className="card">
          <div className="card-header">
            <h3>Schedule</h3>
          </div>
          <div className="card-content">
            {schedule && schedule.enabled ? (
              <div className="schedule-info">
                <div className="schedule-status enabled">
                  <Calendar size={16} />
                  <span>Scheduled</span>
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
                  <div className="schedule-time">at {schedule.time}</div>
                </div>
                {schedule.next_run && (
                  <div className="next-run">
                    Next run: {formatDate(schedule.next_run)}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state-small">
                <Calendar size={24} />
                <p>No schedule configured</p>
                <button className="btn btn-secondary btn-small">
                  Set Schedule
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="card full-width">
          <div className="card-header">
            <h3>Recent Logs</h3>
            <button className="btn-icon">
              <FileText size={16} />
            </button>
          </div>
          <div className="card-content">
            {logs ? (
              <pre className="logs-content">{logs}</pre>
            ) : (
              <div className="empty-state-small">
                <FileText size={24} />
                <p>No logs available</p>
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
              <h3>Sync Preview</h3>
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
                  <span className="label">Files to copy</span>
                </div>
                <div className="summary-item">
                  <span className="count">{preview.files_to_update.length}</span>
                  <span className="label">Files to update</span>
                </div>
                <div className="summary-item danger">
                  <span className="count">{preview.files_to_delete.length}</span>
                  <span className="label">Files to delete</span>
                </div>
              </div>

              {preview.files_to_delete.length > 0 && (
                <div className="warning-box">
                  <AlertTriangle size={16} />
                  <div>
                    <strong>Warning:</strong> This operation will delete {preview.files_to_delete.length} files from the cloud.
                    This action cannot be undone.
                  </div>
                </div>
              )}

              <div className="preview-details">
                {preview.files_to_delete.length > 0 && (
                  <div className="file-changes">
                    <h4>Files to delete:</h4>
                    <div className="file-list">
                      {preview.files_to_delete.slice(0, 10).map((file, index) => (
                        <div key={index} className="file-item danger">
                          {file.path}
                        </div>
                      ))}
                      {preview.files_to_delete.length > 10 && (
                        <div className="file-item">
                          ... and {preview.files_to_delete.length - 10} more
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
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmAndRunSync}
                disabled={isRunning}
              >
                {isRunning ? 'Running...' : 'Confirm & Run Sync'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}