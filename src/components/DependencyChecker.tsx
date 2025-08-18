import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  CheckCircle, 
  AlertCircle, 
  Download,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { DependencyStatus } from '../types';

interface DependencyCheckerProps {
  onAllDependenciesReady: () => void;
}

export default function DependencyChecker({ onAllDependenciesReady }: DependencyCheckerProps) {
  const [dependencies, setDependencies] = useState<DependencyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installLogs, setInstallLogs] = useState<Record<string, string>>({});

  useEffect(() => {
    checkDependencies();
  }, []);

  useEffect(() => {
    // Check if all dependencies are installed
    if (dependencies.length > 0 && dependencies.every(dep => dep.installed)) {
      onAllDependenciesReady();
    }
  }, [dependencies, onAllDependenciesReady]);

  const checkDependencies = async () => {
    setLoading(true);
    try {
      const deps = await invoke<DependencyStatus[]>('check_dependencies');
      setDependencies(deps);
    } catch (error) {
      console.error('Failed to check dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const installDependency = async (dependencyName: string) => {
    setInstalling(prev => ({ ...prev, [dependencyName]: true }));
    setInstallLogs(prev => ({ ...prev, [dependencyName]: 'Installing...' }));
    
    try {
      const result = await invoke<string>('install_dependency', { 
        dependencyName 
      });
      
      setInstallLogs(prev => ({ ...prev, [dependencyName]: result }));
      
      // Recheck dependencies after installation
      setTimeout(() => {
        checkDependencies();
      }, 2000);
      
    } catch (error) {
      console.error(`Failed to install ${dependencyName}:`, error);
      setInstallLogs(prev => ({ 
        ...prev, 
        [dependencyName]: `Installation failed: ${error}` 
      }));
    } finally {
      setInstalling(prev => ({ ...prev, [dependencyName]: false }));
    }
  };

  const allDependenciesInstalled = dependencies.every(dep => dep.installed);
  const hasUninstalledDependencies = dependencies.some(dep => !dep.installed);

  if (loading) {
    return (
      <div className="dependency-checker loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Checking Dependencies</h2>
          <p>Verifying required tools are installed...</p>
        </div>
      </div>
    );
  }

  if (allDependenciesInstalled) {
    return (
      <div className="dependency-checker success">
        <div className="success-container">
          <CheckCircle size={48} className="success-icon" />
          <h2>All Dependencies Ready</h2>
          <p>All required tools are installed and ready to use.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dependency-checker">
      <div className="checker-container">
        <div className="checker-header">
          <h1>Dependency Check</h1>
          <p>
            Cloud Backup requires some external tools to function properly. 
            Please install the missing dependencies below.
          </p>
        </div>

        <div className="dependencies-list">
          {dependencies.map((dependency) => (
            <div 
              key={dependency.name} 
              className={`dependency-item ${dependency.installed ? 'installed' : 'not-installed'}`}
            >
              <div className="dependency-header">
                <div className="dependency-info">
                  <div className="dependency-name">
                    {dependency.installed ? (
                      <CheckCircle size={20} className="status-icon success" />
                    ) : (
                      <AlertCircle size={20} className="status-icon warning" />
                    )}
                    <span>{dependency.name}</span>
                  </div>
                  
                  {dependency.installed && dependency.version && (
                    <div className="dependency-version">
                      Version: {dependency.version}
                    </div>
                  )}
                </div>

                <div className="dependency-actions">
                  {!dependency.installed && (
                    <button
                      className="btn btn-primary"
                      onClick={() => installDependency(dependency.name)}
                      disabled={installing[dependency.name]}
                    >
                      {installing[dependency.name] ? (
                        <>
                          <RefreshCw size={16} className="spinning" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Install
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {!dependency.installed && (
                <div className="dependency-details">
                  <div className="install-command">
                    <strong>Manual Installation:</strong>
                    <code>{dependency.install_command}</code>
                    <button
                      className="btn-icon"
                      onClick={() => navigator.clipboard.writeText(dependency.install_command)}
                      title="Copy command"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              )}

              {installLogs[dependency.name] && (
                <div className="install-log">
                  <pre>{installLogs[dependency.name]}</pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="checker-actions">
          <button 
            className="btn btn-secondary"
            onClick={checkDependencies}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Recheck Dependencies
          </button>

          {!hasUninstalledDependencies && (
            <button 
              className="btn btn-primary"
              onClick={onAllDependenciesReady}
            >
              Continue
            </button>
          )}
        </div>

        <div className="help-section">
          <h3>About These Dependencies</h3>
          <div className="help-items">
            <div className="help-item">
              <strong>AWS CLI:</strong> Required for configuring AWS credentials and managing S3 buckets and IAM users.
            </div>
            <div className="help-item">
              <strong>rclone:</strong> The core backup tool that synchronizes files to cloud storage.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}