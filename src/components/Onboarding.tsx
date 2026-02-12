import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import {
  Folder,
  FolderOpen,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Profile, BackupMode } from '../types';
import OnboardingView, { type StepData } from './OnboardingView';

interface OnboardingProps {
  onProfileCreated: () => void;
  onCancel: () => void;
}

interface FormData {
  language: string;
  name: string;
  rclone_bin: string;
  rclone_conf: string;
  remote: string;
  bucket: string;
  prefix: string;
  sources: string[];
  mode: BackupMode;
}

export default function Onboarding({ onProfileCreated }: OnboardingProps) {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    language: i18n.language,
    name: '',
    rclone_bin: '',
    rclone_conf: '',
    remote: 'aws',
    bucket: '',
    prefix: '',
    sources: [],
    mode: 'Copy'
  });
  const [rcloneCandidates, setRcloneCandidates] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    detectRclone();
  }, []);

  const detectRclone = async () => {
    try {
      const candidates = await invoke<string[]>('detect_rclone');
      setRcloneCandidates(candidates);
      if (candidates.length > 0 && !candidates[0].includes('not found')) {
        setFormData(prev => ({ ...prev, rclone_bin: candidates[0] }));
      }
    } catch (error) {
      console.error('Failed to detect rclone:', error);
    }
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const errors: Record<string, string> = {};
    setIsValidating(true);

    try {
      switch (step) {
        case 0: // Profile name
          if (!formData.name.trim()) {
            errors.name = t('onboarding.profileNameRequired');
          }
          break;

        case 1: // Rclone binary
          if (!formData.rclone_bin) {
            errors.rclone_bin = t('onboarding.rcloneBinaryRequired');
          }
          break;

        case 2: // Rclone config
          if (!formData.rclone_conf) {
            errors.rclone_conf = t('onboarding.rcloneConfigRequired');
          } else {
            try {
              const isValid = await invoke<boolean>('validate_rclone_config', {
                rcloneBin: formData.rclone_bin,
                configPath: formData.rclone_conf
              });
              if (!isValid) {
                errors.rclone_conf = t('onboarding.invalidRcloneConfig');
              }
            } catch (error) {
              errors.rclone_conf = t('onboarding.failedToValidateConfig');
            }
          }
          break;

        case 3: // Remote config
          if (!formData.remote) errors.remote = t('onboarding.remoteNameRequired');
          if (!formData.bucket) errors.bucket = t('onboarding.bucketNameRequired');
          if (!formData.prefix) errors.prefix = t('onboarding.prefixRequired');
          break;

        case 4: // Sources
          if (formData.sources.length === 0) {
            errors.sources = t('onboarding.sourceFoldersRequired');
          }
          break;
      }

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    } finally {
      setIsValidating(false);
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateProfile = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;

    setCreating(true);
    try {
      const profile = await invoke<Profile>('create_profile', { name: formData.name });
      const updatedProfile = {
        ...profile,
        ...formData,
        rclone_flags: [
          '--checksum',
          '--fast-list',
          '--transfers=8',
          '--checkers=32'
        ]
      };

      await invoke('update_profile', { profile: updatedProfile });
      await invoke('set_active_profile', { profileId: profile.id });

      onProfileCreated();
    } catch (error) {
      console.error('Failed to create profile:', error);
      alert(t('onboarding.failedToCreateProfile') + error);
    } finally {
      setCreating(false);
    }
  };

  const addSource = () => {
    setFormData(prev => ({
      ...prev,
      sources: [...prev.sources, '']
    }));
  };

  const updateSource = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      sources: prev.sources.map((source, i) => i === index ? value : source)
    }));
  };

  const removeSource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sources: prev.sources.filter((_, i) => i !== index)
    }));
  };

  const openFolderDialog = async (callback: (path: string) => void) => {
    try {
      const path = prompt('Enter folder path:');
      if (path) {
        callback(path);
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
    }
  };

  const handleLanguageChange = async (language: string) => {
    setFormData(prev => ({ ...prev, language }));
    await i18n.changeLanguage(language);
    localStorage.setItem('i18nextLng', language);
  };

  const languageToggle = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        style={{
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: formData.language === 'en' ? '#007bff' : '#fff',
          color: formData.language === 'en' ? '#fff' : '#000',
          cursor: 'pointer'
        }}
        onClick={() => handleLanguageChange('en')}
      >
        EN
      </button>
      <button
        style={{
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: formData.language === 'es' ? '#007bff' : '#fff',
          color: formData.language === 'es' ? '#fff' : '#000',
          cursor: 'pointer'
        }}
        onClick={() => handleLanguageChange('es')}
      >
        ES
      </button>
    </div>
  );

  const steps: StepData[] = [
    {
      title: t('onboarding.profileName'),
      description: t('onboarding.profileNameDescription'),
      content: (
        <div className="form-group">
          <label htmlFor="profile-name">{t('onboarding.profileName')}</label>
          <input
            id="profile-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('onboarding.profileNamePlaceholder')}
            className={validationErrors.name ? 'error' : ''}
          />
          {validationErrors.name && (
            <div className="error-message">{validationErrors.name}</div>
          )}
          <div className="help-text">
            {t('onboarding.profileNameHelp')}
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.rcloneBinary'),
      description: t('onboarding.rcloneBinaryDescription'),
      content: (
        <div className="form-group">
          <label htmlFor="rclone-bin">{t('onboarding.rcloneBinaryPath')}</label>
          <div className="rclone-candidates">
            {rcloneCandidates.map((candidate, index) => (
              <label key={index} className="radio-option">
                <input
                  type="radio"
                  name="rclone-bin"
                  value={candidate}
                  checked={formData.rclone_bin === candidate}
                  onChange={(e) => setFormData(prev => ({ ...prev, rclone_bin: e.target.value }))}
                />
                <span>{candidate}</span>
              </label>
            ))}
          </div>
          <div className="custom-path">
            <input
              type="text"
              value={formData.rclone_bin}
              onChange={(e) => setFormData(prev => ({ ...prev, rclone_bin: e.target.value }))}
              placeholder={t('onboarding.customPathPlaceholder')}
              className={validationErrors.rclone_bin ? 'error' : ''}
            />
            <button
              type="button"
              className="btn-icon"
              onClick={() => openFolderDialog((path) =>
                setFormData(prev => ({ ...prev, rclone_bin: path }))
              )}
            >
              <Folder size={16} />
            </button>
          </div>
          {validationErrors.rclone_bin && (
            <div className="error-message">{validationErrors.rclone_bin}</div>
          )}
          <div className="help-text">
            {t('onboarding.rcloneInstallHelp')}{' '}
            <a
              href="https://rclone.org/install/"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              rclone.org
            </a>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.rcloneConfig'),
      description: t('onboarding.rcloneConfigDescription'),
      content: (
        <div className="form-group">
          <label htmlFor="rclone-conf">{t('onboarding.rcloneConfigFile')}</label>
          <div className="file-input">
            <input
              id="rclone-conf"
              type="text"
              value={formData.rclone_conf}
              onChange={(e) => setFormData(prev => ({ ...prev, rclone_conf: e.target.value }))}
              placeholder={t('onboarding.rcloneConfigPlaceholder')}
              className={validationErrors.rclone_conf ? 'error' : ''}
            />
            <button
              type="button"
              className="btn-icon"
              onClick={() => openFolderDialog((path) =>
                setFormData(prev => ({ ...prev, rclone_conf: path }))
              )}
            >
              <FolderOpen size={16} />
            </button>
          </div>
          {validationErrors.rclone_conf && (
            <div className="error-message">{validationErrors.rclone_conf}</div>
          )}
          <div className="help-text">
            {t('onboarding.rcloneConfigHelp')}
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.cloudStorage'),
      description: t('onboarding.cloudStorageDescription'),
      content: (
        <div className="form-groups">
          <div className="form-group">
            <label htmlFor="remote">{t('onboarding.remoteName')}</label>
            <input
              id="remote"
              type="text"
              value={formData.remote}
              onChange={(e) => setFormData(prev => ({ ...prev, remote: e.target.value }))}
              placeholder="aws"
              className={validationErrors.remote ? 'error' : ''}
            />
            {validationErrors.remote && (
              <div className="error-message">{validationErrors.remote}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="bucket">{t('onboarding.bucketName')}</label>
            <input
              id="bucket"
              type="text"
              value={formData.bucket}
              onChange={(e) => setFormData(prev => ({ ...prev, bucket: e.target.value }))}
              placeholder={t('onboarding.bucketNamePlaceholder')}
              className={validationErrors.bucket ? 'error' : ''}
            />
            {validationErrors.bucket && (
              <div className="error-message">{validationErrors.bucket}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="prefix">{t('onboarding.prefix')}</label>
            <input
              id="prefix"
              type="text"
              value={formData.prefix}
              onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
              placeholder={t('onboarding.prefixPlaceholder')}
              className={validationErrors.prefix ? 'error' : ''}
            />
            {validationErrors.prefix && (
              <div className="error-message">{validationErrors.prefix}</div>
            )}
            <div className="help-text">
              {t('onboarding.prefixHelp', { bucket: formData.bucket, prefix: formData.prefix })}
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.sourceFolders'),
      description: t('onboarding.sourceFoldersDescription'),
      content: (
        <div className="form-group">
          <label>{t('onboarding.sourceFoldersLabel')}</label>
          <div className="sources-list">
            {formData.sources.map((source, index) => (
              <div key={index} className="source-item">
                <input
                  type="text"
                  value={source}
                  onChange={(e) => updateSource(index, e.target.value)}
                  placeholder={t('onboarding.pathToFolderPlaceholder')}
                />
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => openFolderDialog((path) => updateSource(index, path))}
                >
                  <Folder size={16} />
                </button>
                <button
                  type="button"
                  className="btn-icon danger"
                  onClick={() => removeSource(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={addSource}
          >
            {t('onboarding.addFolder')}
          </button>
          {validationErrors.sources && (
            <div className="error-message">{validationErrors.sources}</div>
          )}
        </div>
      )
    },
    {
      title: t('onboarding.backupMode'),
      description: t('onboarding.backupModeDescription'),
      content: (
        <div className="form-group">
          <label>{t('onboarding.backupMode')}</label>
          <div className="backup-modes">
            <label className="radio-option detailed">
              <input
                type="radio"
                name="backup-mode"
                value="Copy"
                checked={formData.mode === 'Copy'}
                onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as BackupMode }))}
              />
              <div className="option-content">
                <div className="option-title">
                  <CheckCircle size={16} className="text-green" />
                  {t('onboarding.copyModeRecommended')}
                </div>
                <div className="option-description">
                  {t('onboarding.copyModeInfo')}
                </div>
              </div>
            </label>

            <label className="radio-option detailed">
              <input
                type="radio"
                name="backup-mode"
                value="Sync"
                checked={formData.mode === 'Sync'}
                onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as BackupMode }))}
              />
              <div className="option-content">
                <div className="option-title">
                  <AlertCircle size={16} className="text-orange" />
                  {t('onboarding.syncModeAdvanced')}
                </div>
                <div className="option-description">
                  {t('onboarding.syncModeInfo')}
                </div>
              </div>
            </label>
          </div>
        </div>
      )
    }
  ];

  return (
    <OnboardingView
      currentStep={currentStep}
      steps={steps}
      isValidating={isValidating}
      creating={creating}
      languageToggle={languageToggle}
      onNextStep={nextStep}
      onPrevStep={prevStep}
      onCreateProfile={handleCreateProfile}
      t={t}
    />
  );
}
