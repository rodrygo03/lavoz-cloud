import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Profile, UserSession, BackupOperation } from '../types';
import SimpleDashboardView from './SimpleDashboardView';

interface SimpleDashboardProps {
  profile: Profile | null;
  userSession: UserSession;
  onProfileUpdated: () => void;
}

export default function SimpleDashboard({ profile, userSession }: SimpleDashboardProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    lastBackup: null as string | null,
    nextBackup: null as string | null,
  });
  const [recentOperations, setRecentOperations] = useState<BackupOperation[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const isAdmin = userSession.groups.includes('Admins');

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    try {
      // TODO: Replace with actual Tauri commands
      // Mock data for demo
      setStats({
        totalFiles: 1247,
        totalSize: 8589934592, // 8 GB in bytes
        lastBackup: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        nextBackup: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      });

      setRecentOperations([
        {
          id: '1',
          profile_id: profile?.id || '',
          operation_type: 'Backup',
          status: 'Completed',
          started_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 86000000).toISOString(),
          files_transferred: 45,
          bytes_transferred: 52428800,
          error_message: undefined,
          log_output: ''
        }
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      // TODO: Replace with actual Tauri command
      // Mock backup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadDashboardData();
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Backup failed: ' + error);
    } finally {
      setIsBackingUp(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <SimpleDashboardView
      profile={profile}
      userSession={userSession}
      stats={stats}
      recentOperations={recentOperations}
      isBackingUp={isBackingUp}
      isAdmin={isAdmin}
      onBackupNow={handleBackupNow}
      t={t}
      formatBytes={formatBytes}
      formatRelativeTime={formatRelativeTime}
    />
  );
}
