import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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

  if (loading) {
    return (
      <div className="dependency-checker loading">
        <div className="loading-container">
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            <LanguageToggle />
          </div>
          <div className="loading-spinner"></div>
          <h2>{t('dependencies.checkingDependencies')}</h2>
          <p>{t('dependencies.verifyingTools')}</p>
        </div>
      </div>
    );
  }

  if (allDependenciesInstalled) {
    return (
      <div className="dependency-checker success">
        <div className="success-container">
          <CheckCircle size={48} className="success-icon" />
          <h2>{t('dependencies.allReady')}</h2>
          <p>{t('dependencies.allReadyDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dependency-checker">
      <div className="checker-container">
        <div className="checker-header">
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            <LanguageToggle />
          </div>
          <h1>{t('dependencies.title')}</h1>
          <p>{t('dependencies.description')}</p>
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
                      {t('common.version')}: {dependency.version}
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
                          {t('dependencies.installing')}
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          {t('dependencies.install')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {!dependency.installed && (
                <div className="dependency-details">
                  <div className="install-command">
                    <strong>{t('dependencies.manualInstallation')}:</strong>
                    <code>{dependency.install_command}</code>
                    <button
                      className="btn-icon"
                      onClick={() => navigator.clipboard.writeText(dependency.install_command)}
                      title={t('dependencies.copyCommand')}
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
            {t('dependencies.recheckDependencies')}
          </button>

          {!hasUninstalledDependencies && (
            <button 
              className="btn btn-primary"
              onClick={onAllDependenciesReady}
            >
              {t('common.continue')}
            </button>
          )}
        </div>

        <div className="help-section">
          <h3>{t('dependencies.aboutDependencies')}</h3>
          <div className="help-items">
            <div className="help-item">
              <strong>AWS CLI:</strong> {t('dependencies.awsCliDescription')}
            </div>
            <div className="help-item">
              <strong>rclone:</strong> {t('dependencies.rcloneDescription')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}