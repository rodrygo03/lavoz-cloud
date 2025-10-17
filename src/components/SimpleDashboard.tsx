import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cloud,
  HardDrive,
  Clock,
  Activity,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Play,
  RefreshCw,
  Settings
} from 'lucide-react';
import { Profile, UserSession, BackupOperation } from '../types';

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
      // const stats = await invoke('get_backup_stats', { profileId: profile?.id });
      // const operations = await invoke('get_recent_operations', { profileId: profile?.id, limit: 5 });

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
      // await invoke('start_backup', { profileId: profile?.id });

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

  if (!profile) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>{t('dashboard.welcome')}, {userSession.email.split('@')[0]}</h1>
          <p>Manage your cloud backups securely</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleBackupNow}
          disabled={isBackingUp}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isBackingUp ? (
            <>
              <RefreshCw size={16} className="spinning" />
              Backing up...
            </>
          ) : (
            <>
              <Play size={16} />
              Backup Now
            </>
          )}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e3f2fd' }}>
            <Cloud size={24} color="#1976d2" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Files Backed Up</div>
            <div className="stat-value">{stats.totalFiles.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e5f5' }}>
            <HardDrive size={24} color="#7b1fa2" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Storage Used</div>
            <div className="stat-value">{formatBytes(stats.totalSize)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f5e9' }}>
            <Clock size={24} color="#388e3c" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Last Backup</div>
            <div className="stat-value">
              {stats.lastBackup ? formatRelativeTime(stats.lastBackup) : 'Never'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff3e0' }}>
            <Activity size={24} color="#f57c00" />
          </div>
          <div className="stat-content">
            <div className="stat-label">Backup Status</div>
            <div className="stat-value" style={{ fontSize: '16px', color: '#388e3c' }}>
              <CheckCircle size={16} style={{ marginRight: '4px', display: 'inline' }} />
              Active
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="info-box" style={{ marginTop: '24px' }}>
          <AlertCircle size={16} />
          <div>
            <strong>Administrator Access</strong>
            <p>You have full access to all backup data in the organization. Use this privilege responsibly.</p>
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <h2>Recent Activity</h2>

        {recentOperations.length === 0 ? (
          <div className="empty-state">
            <Cloud size={48} color="#ccc" />
            <p>No backup operations yet</p>
            <button className="btn btn-primary" onClick={handleBackupNow}>
              Start Your First Backup
            </button>
          </div>
        ) : (
          <div className="operations-list">
            {recentOperations.map((op) => (
              <div key={op.id} className="operation-item">
                <div className="operation-icon">
                  {op.operation_type === 'Backup' ? (
                    <Upload size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                </div>
                <div className="operation-details">
                  <div className="operation-header">
                    <span className="operation-type">{op.operation_type}</span>
                    <span className={`operation-status status-${op.status.toLowerCase()}`}>
                      {op.status === 'Completed' && <CheckCircle size={14} />}
                      {op.status === 'Failed' && <AlertCircle size={14} />}
                      {op.status}
                    </span>
                  </div>
                  <div className="operation-meta">
                    <span>{op.files_transferred} files</span>
                    <span>•</span>
                    <span>{formatBytes(op.bytes_transferred)}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(op.started_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button className="action-card">
            <Cloud size={24} />
            <span>Browse Cloud Files</span>
          </button>
          <button className="action-card">
            <Settings size={24} />
            <span>Configure Backup</span>
          </button>
          <button className="action-card">
            <Download size={24} />
            <span>Restore Files</span>
          </button>
        </div>
      </div>
    </div>
  );
}
