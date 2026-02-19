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

export interface SimpleDashboardStats {
  totalFiles: number;
  totalSize: number;
  lastBackup: string | null;
  nextBackup: string | null;
}

export interface SimpleDashboardViewProps {
  profile: Profile | null;
  userSession: UserSession;
  stats: SimpleDashboardStats;
  recentOperations: BackupOperation[];
  isBackingUp: boolean;
  isAdmin: boolean;

  // Actions
  onBackupNow: () => void;

  // i18n
  t: (key: string, options?: any) => string;

  // Formatters
  formatBytes: (bytes: number) => string;
  formatRelativeTime: (dateString: string) => string;
}

export default function SimpleDashboardView({
  profile,
  userSession,
  stats,
  recentOperations,
  isBackingUp,
  isAdmin,
  onBackupNow,
  t,
  formatBytes,
  formatRelativeTime,
}: SimpleDashboardViewProps) {
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
          onClick={onBackupNow}
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
            <button className="btn btn-primary" onClick={onBackupNow}>
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
