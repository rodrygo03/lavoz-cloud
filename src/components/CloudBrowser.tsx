import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  Folder, 
  File, 
  Download, 
  Search, 
  RefreshCw,
  ChevronRight,
  Home,
  Calendar,
  HardDrive
} from 'lucide-react';
import { Profile, CloudFile, BackupOperation } from '../types';

interface CloudBrowserProps {
  profile: Profile | null;
}

export default function CloudBrowser({ profile }: CloudBrowserProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (profile) {
      loadFiles('');
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      loadFiles(currentPath);
    }
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    if (!profile) return;

    // Check if profile has required configuration
    // Note: prefix can be empty string for admin users (full bucket access)
    if (!profile.bucket || profile.prefix === null || profile.prefix === undefined) {
      console.log('Profile is missing required configuration (bucket)');
      setFiles([]);
      return;
    }

    setLoading(true);
    try {
      const cloudFiles = await invoke<CloudFile[]>('list_cloud_files', {
        profile,
        path: path || null,
        maxDepth: 1 // Always show only immediate children of current directory
      });
      setFiles(cloudFiles);
    } catch (error) {
      console.error('Failed to load cloud files:', error);
      const errorStr = String(error).toLowerCase();
      
      // Handle common scenarios gracefully - don't show popup for these cases
      if (errorStr.includes('no such file or directory') || 
          errorStr.includes('os error 2') ||
          errorStr.includes('not found') ||
          errorStr.includes('empty bucket') ||
          errorStr.includes('no objects') ||
          errorStr.includes('bucket is empty') ||
          errorStr.includes('404') ||
          errorStr.includes('does not exist')) {
        console.log('Bucket appears to be empty or path does not exist:', error);
        setFiles([]);
      } else {
        // Only show alert for actual errors, not empty buckets
        console.error('Actual error loading files:', error);
        // Replace alert with console.error to avoid popup
        // alert('Failed to load files: ' + error);
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folder: CloudFile) => {
    if (folder.is_dir) {
      const newPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
      setCurrentPath(newPath);
    }
  };

  const navigateUp = () => {
    if (currentPath) {
      const pathParts = currentPath.split('/');
      pathParts.pop();
      setCurrentPath(pathParts.join('/'));
    }
  };

  const navigateToRoot = () => {
    setCurrentPath('');
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filePath)) {
      newSelection.delete(filePath);
    } else {
      newSelection.add(filePath);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    const visibleFiles = getFilteredFiles();
    const newSelection = new Set(selectedFiles);
    visibleFiles.forEach(file => {
      if (!file.is_dir) {
        newSelection.add(file.path);
      }
    });
    setSelectedFiles(newSelection);
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const restoreSelected = async () => {
    if (!profile || selectedFiles.size === 0) return;

    try {
      // Show folder picker dialog
      const localTarget = await open({
        directory: true,
        multiple: false,
        title: `Select folder to restore ${selectedFiles.size} file(s) to`
      });

      if (!localTarget || typeof localTarget !== 'string') {
        return; // User cancelled
      }

      setIsRestoring(true);

      // Build full paths from bucket root by combining currentPath with file paths
      const filesToRestore = Array.from(selectedFiles).map(filePath => {
        // If we're in a subdirectory, prepend currentPath to the file path
        if (currentPath) {
          return `${currentPath}/${filePath}`;
        }
        return filePath;
      });

      console.log('Starting restore operation:', {
        fileCount: filesToRestore.length,
        target: localTarget,
        currentPath,
        files: filesToRestore
      });

      const operation = await invoke<BackupOperation>('restore_files', {
        profile,
        remotePaths: filesToRestore,
        localTarget
      });

      console.log('Restore operation completed:', operation);

      // Show detailed success message
      const message = operation.status === 'Completed' 
        ? `✅ Restore completed successfully!\n\n• ${operation.files_transferred} files restored\n• ${formatFileSize(operation.bytes_transferred)} transferred\n• Target: ${localTarget}`
        : `⚠️ Restore completed with issues:\n\n• ${operation.files_transferred} files processed\n• Error: ${operation.error_message || 'Unknown error'}`;

      alert(message);
      clearSelection();
    } catch (error) {
      console.error('Restore failed:', error);
      alert(t('cloudBrowser.restoreError') + `:\n\n${error}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const getFilteredFiles = (): CloudFile[] => {
    if (!searchTerm) return files;
    
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    return currentPath.split('/');
  };

  if (!profile) {
    return (
      <div className="cloud-browser">
        <div className="empty-state">
          <Folder size={48} />
          <h2>{t('cloudBrowser.noProfileSelected', { defaultValue: 'No Profile Selected' })}</h2>
          <p>{t('cloudBrowser.selectProfileBrowse', { defaultValue: 'Select a profile from the sidebar to browse cloud files.' })}</p>
        </div>
      </div>
    );
  }

  const filteredFiles = getFilteredFiles();

  return (
    <div className="cloud-browser">
      <div className="browser-header">
        <h1>{t('cloudBrowser.title')}</h1>
        <div className="profile-destination">
          {profile.profile_type === 'Admin' ? (
            <>
              {profile.remote}:{profile.bucket} 
              <span className="admin-badge">(Admin View - All Users)</span>
            </>
          ) : (
            `${profile.remote}:${profile.bucket}/${profile.prefix}`
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="browser-navigation">
        <div className="breadcrumbs">
          <button 
            className="breadcrumb-item"
            onClick={navigateToRoot}
          >
            <Home size={16} />
            {t('cloudBrowser.home')}
          </button>
          {getBreadcrumbs().map((part, index) => (
            <div key={index} className="breadcrumb-item">
              <ChevronRight size={14} />
              <button
                onClick={() => {
                  const pathToNavigate = getBreadcrumbs().slice(0, index + 1).join('/');
                  setCurrentPath(pathToNavigate);
                }}
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        <div className="browser-actions">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder={t('cloudBrowser.searchFiles')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="btn-icon"
            onClick={() => loadFiles(currentPath)}
            disabled={loading}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedFiles.size > 0 && (
        <div className="selection-bar">
          <div className="selection-info">
            {selectedFiles.size} {t('cloudBrowser.filesSelected', { defaultValue: 'file(s) selected' })}
          </div>
          <div className="selection-actions">
            <button 
              className="btn btn-secondary"
              onClick={clearSelection}
            >
              {t('cloudBrowser.clearSelection')}
            </button>
            <button 
              className="btn btn-primary"
              onClick={restoreSelected}
              disabled={isRestoring}
            >
              <Download size={16} />
              {isRestoring ? t('cloudBrowser.restoring') : t('cloudBrowser.restoreSelected')}
            </button>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="file-list-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{t('cloudBrowser.loadingFiles', { defaultValue: 'Loading files...' })}</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="empty-state">
            <Folder size={48} />
            <h3>{t('cloudBrowser.noFilesFound')}</h3>
            <p>
              {searchTerm 
                ? t('cloudBrowser.noFilesMatch', { term: searchTerm, defaultValue: `No files match "${searchTerm}"` })
                : t('cloudBrowser.emptyFolder')
              }
            </p>
          </div>
        ) : (
          <div className="file-list">
            <div className="file-list-header">
              <div className="file-list-actions">
                <button 
                  className="btn btn-small btn-secondary"
                  onClick={selectAll}
                >
                  Select All Files
                </button>
              </div>
            </div>

            <div className="file-items">
              {/* Parent directory navigation */}
              {currentPath && (
                <div 
                  className="file-item directory"
                  onClick={navigateUp}
                >
                  <div className="file-icon">
                    <Folder size={20} />
                  </div>
                  <div className="file-info">
                    <div className="file-name">..</div>
                    <div className="file-meta">Parent directory</div>
                  </div>
                </div>
              )}

              {filteredFiles.map((file) => (
                <div 
                  key={file.path}
                  className={`file-item ${file.is_dir ? 'directory' : 'file'} ${
                    selectedFiles.has(file.path) ? 'selected' : ''
                  }`}
                  onClick={() => {
                    if (file.is_dir) {
                      navigateToFolder(file);
                    } else {
                      toggleFileSelection(file.path);
                    }
                  }}
                >
                  <div className="file-icon">
                    {file.is_dir ? (
                      <Folder size={20} />
                    ) : (
                      <File size={20} />
                    )}
                  </div>
                  
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-meta">
                      {!file.is_dir && (
                        <>
                          <span className="file-size">
                            <HardDrive size={12} />
                            {formatFileSize(file.size)}
                          </span>
                          <span className="file-date">
                            <Calendar size={12} />
                            {formatDate(file.mod_time)}
                          </span>
                        </>
                      )}
                      {file.is_dir && (
                        <span className="directory-indicator">Directory</span>
                      )}
                    </div>
                  </div>

                  {!file.is_dir && (
                    <div className="file-actions">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFileSelection(file.path)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}