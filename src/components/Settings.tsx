import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
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

interface SettingsProps {
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export default function Settings({ profile, onProfileUpdated }: SettingsProps) {
  const location = useLocation();
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'sources' | 'advanced' | 'schedule'>('general');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasShownScheduleAlert, setHasShownScheduleAlert] = useState(false);
  const [showScheduleNotification, setShowScheduleNotification] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditedProfile({ ...profile });
      setHasShownScheduleAlert(false); // Reset alert flag for new profile
      loadSchedule();
    }
  }, [profile]);

  useEffect(() => {
    // Check URL parameters to set the active tab
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab && ['general', 'sources', 'advanced', 'schedule'].includes(tab)) {
      setActiveTab(tab as 'general' | 'sources' | 'advanced' | 'schedule');
    }
  }, [location.search]);

  const loadSchedule = async () => {
    if (!profile) return;
    
    console.log('=== LOADING SCHEDULE ===');
    console.log('Profile ID:', profile.id);
    
    try {
      const scheduleData = await invoke<Schedule | null>('get_schedule_status', {
        profileId: profile.id
      });
      
      console.log('Raw schedule data from backend:', scheduleData);
      
      // If no schedule exists, create a default one
      if (!scheduleData) {
        const defaultSchedule: Schedule = {
          enabled: false,
          frequency: { Daily: null },
          time: "02:00",
          last_run: undefined,
          next_run: undefined
        };
        setSchedule(defaultSchedule);
        console.log('No schedule found, using default schedule:', defaultSchedule);
      } else {
        setSchedule(scheduleData);
        console.log('Loaded schedule from backend:', scheduleData);
        console.log('Schedule time field:', scheduleData.time);
        console.log('Schedule next_run field:', scheduleData.next_run);
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
    }
  };

  const handleProfileChange = (field: keyof Profile, value: any) => {
    if (!editedProfile) return;
    
    setEditedProfile(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  const handleSourceChange = (index: number, value: string) => {
    if (!editedProfile) return;
    
    const newSources = [...editedProfile.sources];
    newSources[index] = value;
    handleProfileChange('sources', newSources);
  };

  const addSource = () => {
    if (!editedProfile) return;
    handleProfileChange('sources', [...editedProfile.sources, '']);
  };

  const removeSource = (index: number) => {
    if (!editedProfile) return;
    const newSources = editedProfile.sources.filter((_, i) => i !== index);
    handleProfileChange('sources', newSources);
  };

  const handleFlagChange = (index: number, value: string) => {
    if (!editedProfile) return;
    
    const newFlags = [...editedProfile.rclone_flags];
    newFlags[index] = value;
    handleProfileChange('rclone_flags', newFlags);
  };

  const addFlag = () => {
    if (!editedProfile) return;
    handleProfileChange('rclone_flags', [...editedProfile.rclone_flags, '']);
  };

  const removeFlag = (index: number) => {
    if (!editedProfile) return;
    const newFlags = editedProfile.rclone_flags.filter((_, i) => i !== index);
    handleProfileChange('rclone_flags', newFlags);
  };

  const saveProfile = async () => {
    if (!editedProfile) return;

    setSaving(true);
    try {
      await invoke('update_profile', { profile: editedProfile });
      setHasChanges(false);
      onProfileUpdated();
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const saveSchedule = async (showAlert = true) => {
    if (!profile || !schedule) return;

    console.log('=== SAVING SCHEDULE ===');
    console.log('Profile ID:', profile.id);
    console.log('Schedule object:', JSON.stringify(schedule, null, 2));
    console.log('Schedule time field:', schedule.time);
    console.log('showAlert parameter:', showAlert);
    console.log('hasShownScheduleAlert:', hasShownScheduleAlert);
    console.trace('saveSchedule called from:');
    
    try {
      if (schedule.enabled) {
        console.log('Enabling schedule backup');
        const response = await invoke('schedule_backup', {
          profileId: profile.id,
          schedule
        });
        console.log('Schedule backup response:', response);
        console.log('Schedule backup enabled successfully');
      } else {
        console.log('Disabling schedule backup');
        await invoke('unschedule_backup', {
          profileId: profile.id
        });
        console.log('Schedule backup disabled successfully');
      }
      
      // Show notification for user action
      if (showAlert) {
        console.log('Schedule updated successfully - user action');
        setShowScheduleNotification(true);
        // Hide notification after 3 seconds
        setTimeout(() => {
          setShowScheduleNotification(false);
        }, 3000);
      }
      
      console.log('Reloading schedule to check next_run...');
      await loadSchedule(); // Reload to get updated next_run time
    } catch (error) {
      console.error('Failed to save schedule:', error);
      if (showAlert) {
        alert('Failed to save schedule: ' + error);
      }
    }
  };

  const openFolderDialog = async (callback: (path: string) => void) => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Folder to Backup'
      });
      
      if (selected && typeof selected === 'string') {
        callback(selected);
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
    }
  };

  const openFileDialog = async (callback: (path: string) => void, title: string = 'Select File') => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: title
      });
      
      if (selected && typeof selected === 'string') {
        callback(selected);
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  };


  const autoConfigureRclone = async () => {
    if (!profile) return;
    
    try {
      console.log('Starting complete auto-setup for profile:', profile.id);
      const updatedProfile = await invoke<Profile>('auto_setup_rclone_complete', {
        profileId: profile.id
      });
      
      console.log('Complete auto-setup successful, updated profile:', updatedProfile);
      setEditedProfile(updatedProfile);
      setHasChanges(true);
      console.log('Rclone fully configured successfully!');
      console.log('- Binary:', updatedProfile.rclone_bin);
      console.log('- Config:', updatedProfile.rclone_conf);
      console.log('- Remote:', updatedProfile.remote);
    } catch (error) {
      console.error('Failed to auto-setup rclone:', error);
    }
  };

  if (!profile || !editedProfile) {
    return (
      <div className="settings">
        <div className="empty-state">
          <SettingsIcon size={48} />
          <h2>No Profile Selected</h2>
          <p>Select a profile from the sidebar to view settings.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'sources', label: 'Sources', icon: Folder },
    { id: 'advanced', label: 'Advanced', icon: Zap },
    { id: 'schedule', label: 'Schedule', icon: Clock },
  ] as const;

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
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
                  onClick={() => setActiveTab(tab.id)}
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
              <h2>General Settings</h2>
              
              <div className="form-group">
                <label htmlFor="profile-name">Profile Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={editedProfile.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="rclone-bin">Rclone Binary</label>
                <div className="file-input">
                  <input
                    id="rclone-bin"
                    type="text"
                    value={editedProfile.rclone_bin}
                    onChange={(e) => handleProfileChange('rclone_bin', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => openFileDialog((path) => 
                      handleProfileChange('rclone_bin', path), 'Select Rclone Binary'
                    )}
                  >
                    <Folder size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      console.log('Auto-setup button clicked!');
                      autoConfigureRclone();
                    }}
                  >
                    Auto-Setup
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="rclone-conf">Rclone Config</label>
                <div className="file-input">
                  <input
                    id="rclone-conf"
                    type="text"
                    value={editedProfile.rclone_conf}
                    onChange={(e) => handleProfileChange('rclone_conf', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => openFileDialog((path) => 
                      handleProfileChange('rclone_conf', path), 'Select Rclone Config File'
                    )}
                  >
                    <Folder size={16} />
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="remote">Remote</label>
                  <input
                    id="remote"
                    type="text"
                    value={editedProfile.remote}
                    onChange={(e) => handleProfileChange('remote', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bucket">Bucket</label>
                  <input
                    id="bucket"
                    type="text"
                    value={editedProfile.bucket}
                    onChange={(e) => handleProfileChange('bucket', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prefix">Prefix</label>
                  <input
                    id="prefix"
                    type="text"
                    value={editedProfile.prefix}
                    onChange={(e) => handleProfileChange('prefix', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Backup Mode</label>
                <div className="simple-radio-group">
                  <label className="simple-radio">
                    <input
                      type="radio"
                      name="backup-mode"
                      value="Copy"
                      checked={editedProfile.mode === 'Copy'}
                      onChange={(e) => handleProfileChange('mode', e.target.value as BackupMode)}
                    />
                    <span className="radio-text">
                      <strong>Copy Mode</strong> - Safe mode that only adds new files. Never deletes from cloud.
                    </span>
                  </label>

                  <label className="simple-radio">
                    <input
                      type="radio"
                      name="backup-mode"
                      value="Sync"
                      checked={editedProfile.mode === 'Sync'}
                      onChange={(e) => handleProfileChange('mode', e.target.value as BackupMode)}
                    />
                    <span className="radio-text">
                      <strong>Sync Mode</strong> - Makes cloud exactly match local. May delete files. Requires confirmation.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="settings-section">
              <h2>Source Folders</h2>
              <p>Select the folders you want to backup to the cloud.</p>

              <div className="sources-list">
                {editedProfile.sources.map((source, index) => (
                  <div key={index} className="source-item">
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => handleSourceChange(index, e.target.value)}
                      placeholder="Path to folder"
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => openFolderDialog((path) => 
                        handleSourceChange(index, path)
                      )}
                    >
                      <Folder size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger"
                      onClick={() => removeSource(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={addSource}
              >
                <Plus size={16} />
                Add Source Folder
              </button>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="settings-section">
              <h2>Advanced Settings</h2>
              <p>Configure rclone flags and advanced options.</p>

              <div className="form-group">
                <label>Rclone Flags</label>
                <div className="flags-list">
                  {editedProfile.rclone_flags.map((flag, index) => (
                    <div key={index} className="flag-item">
                      <input
                        type="text"
                        value={flag}
                        onChange={(e) => handleFlagChange(index, e.target.value)}
                        placeholder="--flag-name=value"
                      />
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => removeFlag(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={addFlag}
                >
                  <Plus size={16} />
                  Add Flag
                </button>

                <div className="help-text">
                  Common flags: --checksum, --fast-list, --transfers=8, --checkers=32
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="settings-section">
              <h2>Backup Schedule</h2>
              <p>Configure automatic backup scheduling.</p>

              <div className="schedule-settings">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={schedule?.enabled || false}
                      onChange={(e) => {
                        if (!schedule) {
                          const newSchedule: Schedule = {
                            enabled: e.target.checked,
                            frequency: { Daily: null },
                            time: "02:00",
                            last_run: undefined,
                            next_run: undefined
                          };
                          setSchedule(newSchedule);
                        } else {
                          setSchedule(prev => prev ? { ...prev, enabled: e.target.checked } : null);
                        }
                      }}
                    />
                    <span>Enable automatic backups</span>
                  </label>
                </div>

                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={
                      schedule && typeof schedule.frequency === 'object' && 'Daily' in schedule.frequency ? 'daily' :
                      schedule && typeof schedule.frequency === 'object' && 'Weekly' in schedule.frequency ? 'weekly' :
                      'daily'
                    }
                    onChange={(e) => {
                      let newFreq: ScheduleFrequency;
                      switch (e.target.value) {
                        case 'daily':
                          newFreq = { Daily: null };
                          break;
                        case 'weekly':
                          newFreq = { Weekly: 1 }; // Monday
                          break;
                        case 'monthly':
                          newFreq = { Monthly: 1 };
                          break;
                        default:
                          newFreq = { Daily: null };
                      }
                      if (!schedule) {
                        const newSchedule: Schedule = {
                          enabled: false,
                          frequency: newFreq,
                          time: "02:00",
                          last_run: undefined,
                          next_run: undefined
                        };
                        setSchedule(newSchedule);
                      } else {
                        setSchedule(prev => prev ? { ...prev, frequency: newFreq } : null);
                      }
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="schedule-time">Backup Time (24-hour format)</label>
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
                        console.log('Hour changed, new time:', newTime);
                        
                        if (!schedule) {
                          const newSchedule: Schedule = {
                            enabled: false,
                            frequency: { Daily: null },
                            time: newTime,
                            last_run: undefined,
                            next_run: undefined
                          };
                          setSchedule(newSchedule);
                        } else {
                          setSchedule(prev => prev ? { ...prev, time: newTime } : null);
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
                        console.log('Minute changed, new time:', newTime);
                        
                        if (!schedule) {
                          const newSchedule: Schedule = {
                            enabled: false,
                            frequency: { Daily: null },
                            time: newTime,
                            last_run: undefined,
                            next_run: undefined
                          };
                          setSchedule(newSchedule);
                        } else {
                          setSchedule(prev => prev ? { ...prev, time: newTime } : null);
                        }
                      }}
                      className="time-input minute"
                    />
                  </div>
                  <small className="help-text">Enter time in 24-hour format: 0-23 hours, 0-59 minutes (e.g., 14:30 for 2:30 PM, 22:45 for 10:45 PM)</small>
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={() => saveSchedule(true)}
                  disabled={!schedule}
                >
                  <Save size={16} />
                  Save Schedule
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className="settings-footer">
          <div className="unsaved-changes">
            <Shield size={16} />
            <span>You have unsaved changes</span>
          </div>
          <button 
            className="btn btn-primary"
            onClick={saveProfile}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
      
      {/* Schedule Update Notification */}
      {showScheduleNotification && (
        <div className="schedule-notification">
          <CheckCircle size={16} />
          <span>Schedule updated successfully!</span>
        </div>
      )}
    </div>
  );
}