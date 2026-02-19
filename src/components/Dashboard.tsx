import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Profile, BackupOperation, BackupPreview, Schedule } from '../types';
import DashboardView from './DashboardView';

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
      loadDashboardData();
    }
  }, []); // Run on every mount

  // Also reload when profile changes
  useEffect(() => {
    if (profile) {
      loadDashboardData();
    }
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      // Sync any scheduled backup logs first
      await invoke<number>('sync_scheduled_backup_logs', {
        profileId: profile.id
      });
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
    setLogs('Starting backup...\n');

    try {
      const operation = await invoke<BackupOperation>('backup_run', {
        profileId: profile.id,
        dryRun: false
      });

      setLastBackup(operation);
      setLogs(operation.log_output);

      if (operation.status === 'Completed') {
        // Reload dashboard data to show updated schedule (last_run, next_run)
        await loadDashboardData();

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

    try {
      const previewResult = await invoke<BackupPreview>('backup_preview', {
        profileId: profile.id
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

  return (
    <DashboardView
      profile={profile}
      lastBackup={lastBackup}
      isRunning={isRunning}
      preview={preview}
      showPreview={showPreview}
      schedule={schedule}
      logs={logs}
      onRunBackup={runBackup}
      onRunPreview={runPreview}
      onConfirmAndRunSync={confirmAndRunSync}
      onClosePreview={() => setShowPreview(false)}
      onNavigateToSchedule={() => navigate('/settings?tab=schedule')}
      t={t}
      formatBytes={formatBytes}
      formatDate={formatDate}
      formatTime12Hour={formatTime12Hour}
    />
  );
}
