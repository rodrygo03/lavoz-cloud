import { ReactNode } from 'react';
import {
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export interface DownloadProgress {
  downloaded: number;
  total?: number;
  status: string;
}

export interface DependencyDownloaderViewProps {
  isDownloading: boolean;
  downloadComplete: boolean;
  error: string | null;
  brewProgress: DownloadProgress;
  rcloneProgress: DownloadProgress;
  currentDownload: 'none' | 'brew' | 'rclone';
  languageToggle: ReactNode;

  // Actions
  onStartDownload: () => void;

  // i18n
  t: (key: string, options?: any) => string;

  // Formatters
  formatBytes: (bytes: number) => string;
  getProgressPercentage: (progress: DownloadProgress) => number;
}

export default function DependencyDownloaderView({
  isDownloading,
  downloadComplete,
  error,
  brewProgress,
  rcloneProgress,
  currentDownload,
  languageToggle,
  onStartDownload,
  t,
  formatBytes,
  getProgressPercentage,
}: DependencyDownloaderViewProps) {
  if (downloadComplete) {
    return (
      <div className="dependency-downloader success">
        <div className="success-container">
          <CheckCircle size={48} className="success-icon" />
          <h2>{t('download.complete')}</h2>
          <p>{t('download.completeDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dependency-downloader">
      <div className="downloader-container">
        <div className="downloader-header">
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            {languageToggle}
          </div>
          <h1>{t('download.title')}</h1>
          <p>{t('download.description')}</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="download-status">
          {/* Homebrew Installation Status */}
          <div className={`download-item ${currentDownload === 'brew' ? 'active' : ''}`}>
            <div className="download-header">
              <div className="download-info">
                <strong>Homebrew</strong>
                <span className="download-desc">{t('download.brewDesc')}</span>
              </div>
              <div className="download-progress-text">
                {isDownloading && currentDownload === 'brew' ? (
                  <span>{formatBytes(brewProgress.downloaded)} / {brewProgress.total ? formatBytes(brewProgress.total) : '?'}</span>
                ) : (
                  <span>{brewProgress.status}</span>
                )}
              </div>
            </div>
            {isDownloading && currentDownload === 'brew' && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage(brewProgress)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Rclone Download Status */}
          <div className={`download-item ${currentDownload === 'rclone' ? 'active' : ''}`}>
            <div className="download-header">
              <div className="download-info">
                <strong>rclone</strong>
                <span className="download-desc">{t('download.rcloneDesc')}</span>
              </div>
              <div className="download-progress-text">
                {isDownloading && currentDownload === 'rclone' ? (
                  <span>{formatBytes(rcloneProgress.downloaded)} / {rcloneProgress.total ? formatBytes(rcloneProgress.total) : '?'}</span>
                ) : (
                  <span>{rcloneProgress.status}</span>
                )}
              </div>
            </div>
            {isDownloading && currentDownload === 'rclone' && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage(rcloneProgress)}%` }}
                ></div>
              </div>
            )}
          </div>

        </div>

        <div className="downloader-actions">
          {!isDownloading && !downloadComplete && (
            <button
              className="btn btn-primary"
              onClick={onStartDownload}
              disabled={isDownloading}
            >
              <Download size={16} />
              {t('download.start')}
            </button>
          )}

          {isDownloading && (
            <div className="downloading-indicator">
              <RefreshCw size={16} className="spinning" />
              <span>{t('download.downloading')}</span>
            </div>
          )}
        </div>

        <div className="help-section">
          <h3>{t('download.aboutDownload')}</h3>
          <p>{t('download.aboutDesc')}</p>
          <div className="help-items">
            <div className="help-item">
              <strong>Homebrew:</strong> {t('download.brewHelp')}
            </div>
            <div className="help-item">
              <strong>rclone:</strong> {t('download.rcloneHelp')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
