import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

    setLoading(true);
    try {
      const cloudFiles = await invoke<CloudFile[]>('list_cloud_files', {
        profile,
        path: path || null,
        maxDepth: path ? null : 2 // Show more depth for subdirectories
      });
      setFiles(cloudFiles);
    } catch (error) {
      console.error('Failed to load cloud files:', error);
      alert('Failed to load files: ' + error);
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

    // In a real implementation, we'd show a folder picker dialog
    const localTarget = prompt('Enter local directory to restore files to:');
    if (!localTarget) return;

    setIsRestoring(true);
    try {
      const filesToRestore = Array.from(selectedFiles);
      const operation = await invoke<BackupOperation>('restore_files', {
        profile,
        remotePaths: filesToRestore,
        localTarget
      });

      alert(`Restore completed! ${operation.files_transferred} files restored.`);
      clearSelection();
    } catch (error) {
      console.error('Restore failed:', error);
      alert('Restore failed: ' + error);
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
          <h2>No Profile Selected</h2>
          <p>Select a profile from the sidebar to browse cloud files.</p>
        </div>
      </div>
    );
  }

  const filteredFiles = getFilteredFiles();

  return (
    <div className="cloud-browser">
      <div className="browser-header">
        <h1>Cloud Browser</h1>
        <div className="profile-destination">
          {profile.remote}:{profile.bucket}/{profile.prefix}
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
            Root
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
              placeholder="Search files..."
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
            {selectedFiles.size} file(s) selected
          </div>
          <div className="selection-actions">
            <button 
              className="btn btn-secondary"
              onClick={clearSelection}
            >
              Clear
            </button>
            <button 
              className="btn btn-primary"
              onClick={restoreSelected}
              disabled={isRestoring}
            >
              <Download size={16} />
              {isRestoring ? 'Restoring...' : 'Restore Selected'}
            </button>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="file-list-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="empty-state">
            <Folder size={48} />
            <h3>No files found</h3>
            <p>
              {searchTerm 
                ? `No files match "${searchTerm}"`
                : 'This directory is empty'
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