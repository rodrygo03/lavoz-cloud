import {
  Play,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Activity,
  Settings as SettingsIcon,
  Loader2
} from 'lucide-react';
import { Profile, BackupOperation, BackupPreview, Schedule } from '../types';
import {
  Button,
  IconButton,
  Card,
  CardHeader,
  CardContent,
  Modal,
  ModalHeader,
  ModalContent,
  ModalActions,
  EmptyState,
  StatusBadge,
  AlertBox,
} from './ui';

export interface DashboardViewProps {
  profile: Profile | null;
  lastBackup: BackupOperation | null;
  isRunning: boolean;
  preview: BackupPreview | null;
  showPreview: boolean;
  schedule: Schedule | null;
  logs: string;

  // Actions
  onRunBackup: () => void;
  onRunPreview: () => void;
  onConfirmAndRunSync: () => void;
  onClosePreview: () => void;
  onNavigateToSchedule: () => void;

  // i18n
  t: (key: string, options?: any) => string;

  // Formatters
  formatBytes: (bytes: number) => string;
  formatDate: (dateString: string) => string;
  formatTime12Hour: (time24: string) => string;
}

export default function DashboardView({
  profile,
  lastBackup,
  isRunning,
  preview,
  showPreview,
  schedule,
  logs,
  onRunBackup,
  onRunPreview,
  onConfirmAndRunSync,
  onClosePreview,
  onNavigateToSchedule,
  t,
  formatBytes,
  formatDate,
  formatTime12Hour,
}: DashboardViewProps) {
  if (!profile) {
    return (
      <div className="dashboard">
        <EmptyState
          icon={<Activity size={48} />}
          title={t('dashboard.noProfileSelected')}
          description={t('dashboard.selectProfile')}
        />
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
        <Card>
          <CardHeader title={t('dashboard.backupActions')} />
          <CardContent>
            <div className="action-buttons">
              <Button
                variant="primary"
                size="large"
                onClick={onRunBackup}
                disabled={isRunning}
              >
                {isRunning ? (
                  <Loader2 size={20} className="spinning" />
                ) : (
                  <Play size={20} />
                )}
                {isRunning ? t('dashboard.runningBackup') : t('dashboard.runBackupNow')}
              </Button>

              {profile.mode === 'Sync' && (
                <Button
                  variant="secondary"
                  onClick={onRunPreview}
                  disabled={isRunning}
                >
                  <Eye size={16} />
                  {t('dashboard.previewChanges')}
                </Button>
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
          </CardContent>
        </Card>

        {/* Last Backup Status */}
        <Card>
          <CardHeader title={t('dashboard.lastBackup')} />
          <CardContent>
            {lastBackup ? (
              <div className="backup-status">
                <div className="status-header">
                  <StatusBadge
                    status={lastBackup.status.toLowerCase() as 'completed' | 'failed' | 'running'}
                    icon={
                      <>
                        {lastBackup.status === 'Completed' && <CheckCircle size={20} />}
                        {lastBackup.status === 'Failed' && <AlertTriangle size={20} />}
                        {lastBackup.status === 'Running' && <Clock size={20} />}
                      </>
                    }
                  >
                    {lastBackup.status === 'Completed' && t('dashboard.statusCompleted')}
                    {lastBackup.status === 'Failed' && t('dashboard.statusFailed')}
                    {lastBackup.status === 'Running' && t('dashboard.statusRunning')}
                  </StatusBadge>
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
              <EmptyState
                size="small"
                icon={<Clock size={24} />}
                title={t('dashboard.noBackupsYet')}
              />
            )}
          </CardContent>
        </Card>

        {/* Schedule Status */}
        <Card>
          <CardHeader title={t('dashboard.schedule')} />
          <CardContent>
            {schedule && schedule.enabled ? (
              <div className="schedule-info">
                <div className="schedule-status enabled">
                  <Calendar size={16} />
                  <span>{t('dashboard.scheduled')}</span>
                </div>
                <div className="schedule-details">
                  <div className="schedule-frequency">
                    {/* Format schedule frequency based on type */}
                    {schedule.frequency === 'Daily' && 'Daily'}
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
                <Button
                  variant="secondary"
                  size="small"
                  onClick={onNavigateToSchedule}
                >
                  <SettingsIcon size={14} />
                  {t('dashboard.changeSchedule')}
                </Button>
              </div>
            ) : (
              <EmptyState size="small" icon={<Calendar size={24} />} title={t('dashboard.noScheduleConfigured')}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={onNavigateToSchedule}
                >
                  <SettingsIcon size={14} />
                  {t('dashboard.setSchedule')}
                </Button>
              </EmptyState>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card fullWidth>
          <CardHeader
            title={t('dashboard.recentLogs')}
            action={
              <IconButton>
                <FileText size={16} />
              </IconButton>
            }
          />
          <CardContent>
            {logs || lastBackup?.log_output ? (
              <pre className="logs-content">{logs || lastBackup?.log_output}</pre>
            ) : (
              <EmptyState
                size="small"
                icon={<FileText size={24} />}
                title={t('dashboard.noLogsAvailable')}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      <Modal open={showPreview && !!preview} onClose={onClosePreview}>
        {preview && (
          <>
            <ModalHeader
              title={t('dashboard.syncPreview', { defaultValue: 'Sync Preview' })}
              onClose={onClosePreview}
            />
            <ModalContent>
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
                <AlertBox variant="warning" icon={<AlertTriangle size={16} />}>
                  <div>
                    <strong>{t('dashboard.warning', { defaultValue: 'Warning' })}:</strong> {t('dashboard.deleteWarning', { count: preview.files_to_delete.length, defaultValue: `This operation will delete ${preview.files_to_delete.length} files from the cloud. This action cannot be undone.` })}
                  </div>
                </AlertBox>
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
            </ModalContent>
            <ModalActions>
              <Button
                variant="secondary"
                onClick={onClosePreview}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={onConfirmAndRunSync}
                disabled={isRunning}
              >
                {isRunning ? t('dashboard.running', { defaultValue: 'Running...' }) : t('dashboard.confirmAndRunSync', { defaultValue: 'Confirm & Run Sync' })}
              </Button>
            </ModalActions>
          </>
        )}
      </Modal>
    </div>
  );
}
