import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Profile, Schedule } from '../types';
import SettingsView from './SettingsView';

interface SettingsProps {
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export default function Settings({ profile, onProfileUpdated }: SettingsProps) {
  const { t } = useTranslation();
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
          frequency: 'Daily',
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

  return (
    <SettingsView
      profile={profile}
      editedProfile={editedProfile}
      schedule={schedule}
      activeTab={activeTab}
      saving={saving}
      hasChanges={hasChanges}
      showScheduleNotification={showScheduleNotification}
      onSetActiveTab={setActiveTab}
      onProfileChange={handleProfileChange}
      onSourceChange={handleSourceChange}
      onAddSource={addSource}
      onRemoveSource={removeSource}
      onFlagChange={handleFlagChange}
      onAddFlag={addFlag}
      onRemoveFlag={removeFlag}
      onSaveProfile={saveProfile}
      onSaveSchedule={() => saveSchedule(true)}
      onScheduleChange={setSchedule}
      onOpenFolderDialog={openFolderDialog}
      onOpenFileDialog={openFileDialog}
      onAutoConfigureRclone={() => {
        console.log('Auto-setup button clicked!');
        autoConfigureRclone();
      }}
      t={t}
    />
  );
}
