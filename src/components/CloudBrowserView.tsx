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
import { Profile, CloudFile } from '../types';
import { Button, IconButton, EmptyState, LoadingState, Badge } from './ui';

export interface CloudBrowserViewProps {
  profile: Profile | null;
  files: CloudFile[];
  currentPath: string;
  loading: boolean;
  selectedFiles: Set<string>;
  searchTerm: string;
  isRestoring: boolean;
  filteredFiles: CloudFile[];
  breadcrumbs: string[];

  // Actions
  onNavigateToRoot: () => void;
  onNavigateToPath: (path: string) => void;
  onNavigateUp: () => void;
  onNavigateToFolder: (folder: CloudFile) => void;
  onToggleFileSelection: (filePath: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRestoreSelected: () => void;
  onRefresh: () => void;
  onSearchChange: (term: string) => void;

  // i18n
  t: (key: string, options?: any) => string;

  // Formatters
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
}

export default function CloudBrowserView({
  profile,
  currentPath,
  loading,
  selectedFiles,
  searchTerm,
  isRestoring,
  filteredFiles,
  breadcrumbs,
  onNavigateToRoot,
  onNavigateToPath,
  onNavigateUp,
  onNavigateToFolder,
  onToggleFileSelection,
  onSelectAll,
  onClearSelection,
  onRestoreSelected,
  onRefresh,
  onSearchChange,
  t,
  formatFileSize,
  formatDate,
}: CloudBrowserViewProps) {
  if (!profile) {
    return (
      <div className="cloud-browser">
        <EmptyState
          icon={<Folder size={48} />}
          title={t('cloudBrowser.noProfileSelected', { defaultValue: 'No Profile Selected' })}
          description={t('cloudBrowser.selectProfileBrowse', { defaultValue: 'Select a profile from the sidebar to browse cloud files.' })}
        />
      </div>
    );
  }

  return (
    <div className="cloud-browser">
      <div className="browser-header">
        <h1>{t('cloudBrowser.title')}</h1>
        <div className="profile-destination">
          {profile.profile_type === 'Admin' ? (
            <>
              {profile.remote}:{profile.bucket}
              <Badge>(Admin View - All Users)</Badge>
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
            onClick={onNavigateToRoot}
          >
            <Home size={16} />
            {t('cloudBrowser.home')}
          </button>
          {breadcrumbs.map((part, index) => (
            <div key={index} className="breadcrumb-item">
              <ChevronRight size={14} />
              <button
                onClick={() => {
                  const pathToNavigate = breadcrumbs.slice(0, index + 1).join('/');
                  onNavigateToPath(pathToNavigate);
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
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <IconButton
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} />
          </IconButton>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedFiles.size > 0 && (
        <div className="selection-bar">
          <div className="selection-info">
            {selectedFiles.size} {t('cloudBrowser.filesSelected', { defaultValue: 'file(s) selected' })}
          </div>
          <div className="selection-actions">
            <Button
              variant="secondary"
              onClick={onClearSelection}
            >
              {t('cloudBrowser.clearSelection')}
            </Button>
            <Button
              variant="primary"
              onClick={onRestoreSelected}
              disabled={isRestoring}
            >
              <Download size={16} />
              {isRestoring ? t('cloudBrowser.restoring') : t('cloudBrowser.restoreSelected')}
            </Button>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="file-list-container">
        {loading ? (
          <LoadingState text={t('cloudBrowser.loadingFiles', { defaultValue: 'Loading files...' })} />
        ) : filteredFiles.length === 0 ? (
          <EmptyState
            icon={<Folder size={48} />}
            title={t('cloudBrowser.noFilesFound')}
            description={
              searchTerm
                ? t('cloudBrowser.noFilesMatch', { term: searchTerm, defaultValue: `No files match "${searchTerm}"` })
                : t('cloudBrowser.emptyFolder')
            }
          />
        ) : (
          <div className="file-list">
            <div className="file-list-header">
              <div className="file-list-actions">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={onSelectAll}
                >
                  Select All Files
                </Button>
              </div>
            </div>

            <div className="file-items">
              {/* Parent directory navigation */}
              {currentPath && (
                <div
                  className="file-item directory"
                  onClick={onNavigateUp}
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
                      onNavigateToFolder(file);
                    } else {
                      onToggleFileSelection(file.path);
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
                        onChange={() => onToggleFileSelection(file.path)}
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
