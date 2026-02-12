import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import DependencyDownloaderView, { type DownloadProgress } from './DependencyDownloaderView';

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

  const languageToggle = (
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

  return (
    <DependencyDownloaderView
      isDownloading={isDownloading}
      downloadComplete={downloadComplete}
      error={error}
      brewProgress={brewProgress}
      rcloneProgress={rcloneProgress}
      currentDownload={currentDownload}
      languageToggle={languageToggle}
      onStartDownload={startDownload}
      t={t}
      formatBytes={formatBytes}
      getProgressPercentage={getProgressPercentage}
    />
  );
}
