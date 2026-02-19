import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Profile, Schedule } from '../types';
import SettingsViewAlt from '../prototypes/SettingsViewAlt';

interface SettingsProps {
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export default function Settings({ profile, onProfileUpdated }: SettingsProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'sources' | 'schedule'>('general');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [showScheduleNotification, setShowScheduleNotification] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditedProfile({ ...profile });

      loadSchedule();
    }
  }, [profile]);

  useEffect(() => {
    // Check URL parameters to set the active tab
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab && ['general', 'sources', 'schedule'].includes(tab)) {
      setActiveTab(tab as 'general' | 'sources' | 'schedule');
    }
  }, [location.search]);

  const loadSchedule = async () => {
    if (!profile) return;


    try {
      const scheduleData = await invoke<Schedule | null>('get_schedule_status', {
        profileId: profile.id
      });


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
      } else {
        setSchedule(scheduleData);
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

  // Flag handlers removed - not used by SettingsViewAlt

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



    try {
      if (schedule.enabled) {
        await invoke('schedule_backup', {
          profileId: profile.id,
          schedule
        });
      } else {
        await invoke('unschedule_backup', {
          profileId: profile.id
        });
      }

      // Show notification for user action
      if (showAlert) {
        setShowScheduleNotification(true);
        // Hide notification after 3 seconds
        setTimeout(() => {
          setShowScheduleNotification(false);
        }, 3000);
      }


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

  // openFileDialog and autoConfigureRclone removed - not used by SettingsViewAlt

  return (
    <SettingsViewAlt
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
      onSaveProfile={saveProfile}
      onSaveSchedule={() => saveSchedule(true)}
      onScheduleChange={setSchedule}
      onOpenFolderDialog={openFolderDialog}
      t={t}
    />
  );
}
