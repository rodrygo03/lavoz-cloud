import {
  Settings as SettingsIcon,
  Save,
  Plus,
  Trash2,
  Folder,
  Clock,
  Shield,
  Zap,
  CheckCircle
} from 'lucide-react';
import { Profile, Schedule, ScheduleFrequency, BackupMode } from '../types';
import LanguageSwitcher from './LanguageSwitcher';
import { Button, IconButton, FormGroup, FormRow, FileInput, EmptyState } from './ui';

export interface SettingsViewProps {
  profile: Profile | null;
  editedProfile: Profile | null;
  schedule: Schedule | null;
  activeTab: 'general' | 'sources' | 'advanced' | 'schedule';
  saving: boolean;
  hasChanges: boolean;
  showScheduleNotification: boolean;

  // Actions
  onSetActiveTab: (tab: 'general' | 'sources' | 'advanced' | 'schedule') => void;
  onProfileChange: (field: keyof Profile, value: any) => void;
  onSourceChange: (index: number, value: string) => void;
  onAddSource: () => void;
  onRemoveSource: (index: number) => void;
  onFlagChange: (index: number, value: string) => void;
  onAddFlag: () => void;
  onRemoveFlag: (index: number) => void;
  onSaveProfile: () => void;
  onSaveSchedule: () => void;
  onScheduleChange: (schedule: Schedule | null) => void;
  onOpenFolderDialog: (callback: (path: string) => void) => void;
  onOpenFileDialog: (callback: (path: string) => void, title?: string) => void;
  onAutoConfigureRclone: () => void;

  // i18n
  t: (key: string, options?: any) => string;
}

export default function SettingsView({
  profile,
  editedProfile,
  schedule,
  activeTab,
  saving,
  hasChanges,
  showScheduleNotification,
  onSetActiveTab,
  onProfileChange,
  onSourceChange,
  onAddSource,
  onRemoveSource,
  onFlagChange,
  onAddFlag,
  onRemoveFlag,
  onSaveProfile,
  onSaveSchedule,
  onScheduleChange,
  onOpenFolderDialog,
  onOpenFileDialog,
  onAutoConfigureRclone,
  t,
}: SettingsViewProps) {
  if (!profile || !editedProfile) {
    return (
      <div className="settings">
        <EmptyState
          icon={<SettingsIcon size={48} />}
          title={t('settings.noProfileSelected', { defaultValue: 'No Profile Selected' })}
          description={t('settings.selectProfileSettings', { defaultValue: 'Select a profile from the sidebar to view settings.' })}
        />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: t('settings.general'), icon: SettingsIcon },
    { id: 'sources', label: t('settings.sources'), icon: Folder },
    { id: 'advanced', label: t('settings.advanced'), icon: Zap },
    { id: 'schedule', label: t('settings.schedule'), icon: Clock },
  ] as const;

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>{t('settings.title')}</h1>
        <div className="profile-name">{profile.name}</div>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => onSetActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="settings-main">
          {activeTab === 'general' && (
            <div className="settings-section">
              <h2>{t('settings.general')}</h2>

              <LanguageSwitcher />

              <FormGroup label={t('settings.profileName')} htmlFor="profile-name">
                <input
                  id="profile-name"
                  type="text"
                  value={editedProfile.name}
                  onChange={(e) => onProfileChange('name', e.target.value)}
                />
              </FormGroup>

              <FormGroup label={t('settings.rcloneBinary')} htmlFor="rclone-bin">
                <FileInput
                  actions={
                    <>
                      <IconButton
                        type="button"
                        onClick={() => onOpenFileDialog((path) =>
                          onProfileChange('rclone_bin', path), 'Select Rclone Binary'
                        )}
                      >
                        <Folder size={16} />
                      </IconButton>
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={onAutoConfigureRclone}
                      >
                        {t('settings.autoSetup', { defaultValue: 'Auto-Setup' })}
                      </Button>
                    </>
                  }
                >
                  <input
                    id="rclone-bin"
                    type="text"
                    value={editedProfile.rclone_bin}
                    onChange={(e) => onProfileChange('rclone_bin', e.target.value)}
                  />
                </FileInput>
              </FormGroup>

              <FormGroup label={t('settings.rcloneConfig')} htmlFor="rclone-conf">
                <FileInput
                  actions={
                    <IconButton
                      type="button"
                      onClick={() => onOpenFileDialog((path) =>
                        onProfileChange('rclone_conf', path), 'Select Rclone Config File'
                      )}
                    >
                      <Folder size={16} />
                    </IconButton>
                  }
                >
                  <input
                    id="rclone-conf"
                    type="text"
                    value={editedProfile.rclone_conf}
                    onChange={(e) => onProfileChange('rclone_conf', e.target.value)}
                  />
                </FileInput>
              </FormGroup>

              <FormRow>
                <FormGroup label={t('settings.remote')} htmlFor="remote">
                  <input
                    id="remote"
                    type="text"
                    value={editedProfile.remote}
                    onChange={(e) => onProfileChange('remote', e.target.value)}
                  />
                </FormGroup>

                <FormGroup label={t('settings.bucket')} htmlFor="bucket">
                  <input
                    id="bucket"
                    type="text"
                    value={editedProfile.bucket}
                    onChange={(e) => onProfileChange('bucket', e.target.value)}
                  />
                </FormGroup>

                <FormGroup label={t('settings.prefix')} htmlFor="prefix">
                  <input
                    id="prefix"
                    type="text"
                    value={editedProfile.prefix}
                    onChange={(e) => onProfileChange('prefix', e.target.value)}
                  />
                </FormGroup>
              </FormRow>

              <FormGroup label={t('settings.backupMode')}>
                <div className="simple-radio-group">
                  <label className="simple-radio">
                    <input
                      type="radio"
                      name="backup-mode"
                      value="Copy"
                      checked={editedProfile.mode === 'Copy'}
                      onChange={(e) => onProfileChange('mode', e.target.value as BackupMode)}
                    />
                    <span className="radio-text">
                      <strong>{t('settings.copyMode')}</strong> - {t('settings.copyModeDescription')}
                    </span>
                  </label>

                  <label className="simple-radio">
                    <input
                      type="radio"
                      name="backup-mode"
                      value="Sync"
                      checked={editedProfile.mode === 'Sync'}
                      onChange={(e) => onProfileChange('mode', e.target.value as BackupMode)}
                    />
                    <span className="radio-text">
                      <strong>{t('settings.syncMode')}</strong> - {t('settings.syncModeDescription')}
                    </span>
                  </label>
                </div>
              </FormGroup>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="settings-section">
              <h2>{t('settings.foldersToBackup')}</h2>
              <p>{t('settings.selectFoldersDescription', { defaultValue: 'Select the folders you want to backup to the cloud.' })}</p>

              <div className="sources-list">
                {editedProfile.sources.map((source, index) => (
                  <div key={index} className="source-item">
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => onSourceChange(index, e.target.value)}
                      placeholder={t('settings.pathToFolder')}
                    />
                    <IconButton
                      type="button"
                      onClick={() => onOpenFolderDialog((path) =>
                        onSourceChange(index, path)
                      )}
                    >
                      <Folder size={16} />
                    </IconButton>
                    <IconButton
                      type="button"
                      variant="danger"
                      onClick={() => onRemoveSource(index)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                ))}
              </div>

              <Button
                variant="secondary"
                type="button"
                onClick={onAddSource}
              >
                <Plus size={16} />
                {t('settings.addFolder')}
              </Button>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="settings-section">
              <h2>{t('settings.advanced')}</h2>
              <p>{t('settings.advancedDescription', { defaultValue: 'Configure rclone flags and advanced options.' })}</p>

              <FormGroup label={t('settings.rcloneFlags')} helpText="Common flags: --checksum, --fast-list, --transfers=8, --checkers=32">
                <div className="flags-list">
                  {editedProfile.rclone_flags.map((flag, index) => (
                    <div key={index} className="flag-item">
                      <input
                        type="text"
                        value={flag}
                        onChange={(e) => onFlagChange(index, e.target.value)}
                        placeholder="--flag-name=value"
                      />
                      <IconButton
                        type="button"
                        variant="danger"
                        onClick={() => onRemoveFlag(index)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  type="button"
                  onClick={onAddFlag}
                >
                  <Plus size={16} />
                  {t('settings.addFlag')}
                </Button>
              </FormGroup>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="settings-section">
              <h2>{t('settings.backupSchedule')}</h2>
              <p>{t('settings.configureAutomaticBackup')}</p>

              <div className="schedule-settings">
                <FormGroup>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={schedule?.enabled || false}
                      onChange={(e) => {
                        if (!schedule) {
                          const newSchedule: Schedule = {
                            enabled: e.target.checked,
                            frequency: 'Daily',
                            time: "02:00",
                            last_run: undefined,
                            next_run: undefined
                          };
                          onScheduleChange(newSchedule);
                        } else {
                          onScheduleChange({ ...schedule, enabled: e.target.checked });
                        }
                      }}
                    />
                    <span>{t('settings.enableAutomaticBackups')}</span>
                  </label>
                </FormGroup>

                <FormGroup label={t('settings.frequency')}>
                  <select
                    value={
                      schedule && schedule.frequency === 'Daily' ? 'daily' :
                      schedule && typeof schedule.frequency === 'object' && 'Daily' in schedule.frequency ? 'daily' :
                      schedule && typeof schedule.frequency === 'object' && 'Weekly' in schedule.frequency ? 'weekly' :
                      schedule && typeof schedule.frequency === 'object' && 'Monthly' in schedule.frequency ? 'monthly' :
                      'daily'
                    }
                    onChange={(e) => {
                      let newFreq: ScheduleFrequency;
                      switch (e.target.value) {
                        case 'daily':
                          newFreq = 'Daily';
                          break;
                        case 'weekly':
                          newFreq = { Weekly: 1 }; // Monday
                          break;
                        case 'monthly':
                          newFreq = { Monthly: 1 };
                          break;
                        default:
                          newFreq = 'Daily';
                      }
                      if (!schedule) {
                        const newSchedule: Schedule = {
                          enabled: false,
                          frequency: newFreq,
                          time: "02:00",
                          last_run: undefined,
                          next_run: undefined
                        };
                        onScheduleChange(newSchedule);
                      } else {
                        onScheduleChange({ ...schedule, frequency: newFreq });
                      }
                    }}
                  >
                    <option value="daily">{t('settings.daily')}</option>
                    <option value="weekly">{t('settings.weekly')}</option>
                    <option value="monthly">{t('settings.monthly')}</option>
                  </select>
                </FormGroup>

                <FormGroup label={t('settings.time')} htmlFor="schedule-time" helpText={t('settings.timeFormat')}>
                  <div className="time-input-group">
                    <input
                      id="schedule-time-hour"
                      type="number"
                      min="0"
                      max="23"
                      value={parseInt((schedule?.time || "02:00").split(':')[0])}
                      onChange={(e) => {
                        const hour = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                        const minute = (schedule?.time || "02:00").split(':')[1] || "00";
                        const newTime = `${hour.toString().padStart(2, '0')}:${minute}`;

                        if (!schedule) {
                          const newSchedule: Schedule = {
                            enabled: false,
                            frequency: 'Daily',
                            time: newTime,
                            last_run: undefined,
                            next_run: undefined
                          };
                          onScheduleChange(newSchedule);
                        } else {
                          onScheduleChange({ ...schedule, time: newTime });
                        }
                      }}
                      className="time-input hour"
                    />
                    <span className="time-separator">:</span>
                    <input
                      id="schedule-time-minute"
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={parseInt((schedule?.time || "02:00").split(':')[1])}
                      onChange={(e) => {
                        const minute = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        const hour = (schedule?.time || "02:00").split(':')[0] || "02";
                        const newTime = `${hour}:${minute.toString().padStart(2, '0')}`;

                        if (!schedule) {
                          const newSchedule: Schedule = {
                            enabled: false,
                            frequency: 'Daily',
                            time: newTime,
                            last_run: undefined,
                            next_run: undefined
                          };
                          onScheduleChange(newSchedule);
                        } else {
                          onScheduleChange({ ...schedule, time: newTime });
                        }
                      }}
                      className="time-input minute"
                    />
                  </div>
                </FormGroup>

                <Button
                  variant="primary"
                  onClick={onSaveSchedule}
                  disabled={!schedule}
                >
                  <Save size={16} />
                  {t('settings.saveSchedule')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className="settings-footer">
          <div className="unsaved-changes">
            <Shield size={16} />
            <span>{t('settings.unsavedChanges', { defaultValue: 'You have unsaved changes' })}</span>
          </div>
          <Button
            variant="primary"
            onClick={onSaveProfile}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? t('settings.saving') : t('settings.saveChanges')}
          </Button>
        </div>
      )}

      {/* Schedule Update Notification */}
      {showScheduleNotification && (
        <div className="schedule-notification">
          <CheckCircle size={16} />
          <span>{t('settings.scheduleUpdatedSuccessfully')}</span>
        </div>
      )}
    </div>
  );
}
