import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Profile, CloudFile, BackupOperation } from '../types';
import CloudBrowserView from './CloudBrowserView';

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

  return (
    <CloudBrowserView
      profile={profile}
      files={files}
      currentPath={currentPath}
      loading={loading}
      selectedFiles={selectedFiles}
      searchTerm={searchTerm}
      isRestoring={isRestoring}
      filteredFiles={getFilteredFiles()}
      breadcrumbs={getBreadcrumbs()}
      onNavigateToRoot={navigateToRoot}
      onNavigateToPath={(path) => setCurrentPath(path)}
      onNavigateUp={navigateUp}
      onNavigateToFolder={navigateToFolder}
      onToggleFileSelection={toggleFileSelection}
      onSelectAll={selectAll}
      onClearSelection={clearSelection}
      onRestoreSelected={restoreSelected}
      onRefresh={() => loadFiles(currentPath)}
      onSearchChange={setSearchTerm}
      t={t}
      formatFileSize={formatFileSize}
      formatDate={formatDate}
    />
  );
}
