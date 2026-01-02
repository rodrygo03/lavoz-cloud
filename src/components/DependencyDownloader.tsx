import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { 
  Download, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface DownloadProgress {
  downloaded: number;
  total?: number;
  status: string;
}

interface DependencyDownloaderProps {
  onDownloadComplete: () => void;
}

export default function DependencyDownloader({ onDownloadComplete }: DependencyDownloaderProps) {
  const { t, i18n } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brewProgress, setBrewProgress] = useState<DownloadProgress>({ downloaded: 0, status: 'Waiting...' });
  const [rcloneProgress, setRcloneProgress] = useState<DownloadProgress>({ downloaded: 0, status: 'Waiting...' });
  const [currentDownload, setCurrentDownload] = useState<'none' | 'brew' | 'rclone'>('none');

  useEffect(() => {
    // Listen for download progress events
    const setupListeners = async () => {
      await listen<DownloadProgress>('brew-install-progress', (event) => {
        setBrewProgress(event.payload);
        setCurrentDownload('brew');
      });

      await listen<DownloadProgress>('rclone-download-progress', (event) => {
        setRcloneProgress(event.payload);
        setCurrentDownload('rclone');
      });

      await listen('download-start', () => {
        setIsDownloading(true);
        setError(null);
      });

      await listen('download-complete', () => {
        setIsDownloading(false);
        setDownloadComplete(true);
        setTimeout(() => {
          onDownloadComplete();
        }, 1500);
      });
    };

    setupListeners();
  }, [onDownloadComplete]);

  const startDownload = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      await invoke('download_dependencies');
    } catch (error) {
      console.error('Download failed:', error);
      setError(error as string);
      setIsDownloading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgressPercentage = (progress: DownloadProgress) => {
    if (!progress.total || progress.total === 0) return 0;
    return Math.round((progress.downloaded / progress.total) * 100);
  };

  // Language toggle component
  const LanguageToggle = () => (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        style={{
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: i18n.language === 'en' ? '#007bff' : '#fff',
          color: i18n.language === 'en' ? '#fff' : '#000',
          cursor: 'pointer'
        }}
        onClick={() => {
          i18n.changeLanguage('en');
          localStorage.setItem('i18nextLng', 'en');
        }}
      >
        EN
      </button>
      <button
        style={{
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: i18n.language === 'es' ? '#007bff' : '#fff',
          color: i18n.language === 'es' ? '#fff' : '#000',
          cursor: 'pointer'
        }}
        onClick={() => {
          i18n.changeLanguage('es');
          localStorage.setItem('i18nextLng', 'es');
        }}
      >
        ES
      </button>
    </div>
  );

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
            <LanguageToggle />
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
              onClick={startDownload}
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