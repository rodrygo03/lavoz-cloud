import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
// import { open } from '@tauri-apps/plugin-opener';
import { 
  ArrowRight, 
  ArrowLeft, 
  Folder, 
  FolderOpen,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Profile, BackupMode } from '../types';

interface OnboardingProps {
  onProfileCreated: () => void;
  onCancel: () => void;
}

interface FormData {
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
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
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
            errors.name = 'Profile name is required';
          }
          break;

        case 1: // Rclone binary
          if (!formData.rclone_bin) {
            errors.rclone_bin = 'Rclone binary path is required';
          }
          break;

        case 2: // Rclone config
          if (!formData.rclone_conf) {
            errors.rclone_conf = 'Rclone config path is required';
          } else {
            try {
              const isValid = await invoke<boolean>('validate_rclone_config', {
                rcloneBin: formData.rclone_bin,
                configPath: formData.rclone_conf
              });
              if (!isValid) {
                errors.rclone_conf = 'Invalid rclone config file';
              }
            } catch (error) {
              errors.rclone_conf = 'Failed to validate rclone config';
            }
          }
          break;

        case 3: // Remote config
          if (!formData.remote) errors.remote = 'Remote name is required';
          if (!formData.bucket) errors.bucket = 'Bucket name is required';
          if (!formData.prefix) errors.prefix = 'Prefix is required';
          break;

        case 4: // Sources
          if (formData.sources.length === 0) {
            errors.sources = 'At least one source folder is required';
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
      alert('Failed to create profile: ' + error);
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
      // In a real implementation, we'd use tauri's dialog plugin
      // For now, we'll use a simple prompt
      const path = prompt('Enter folder path:');
      if (path) {
        callback(path);
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
    }
  };

  const steps = [
    {
      title: 'Profile Name',
      description: 'Give your backup profile a name',
      content: (
        <div className="form-group">
          <label htmlFor="profile-name">Profile Name</label>
          <input
            id="profile-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Personal Backup, Work Files"
            className={validationErrors.name ? 'error' : ''}
          />
          {validationErrors.name && (
            <div className="error-message">{validationErrors.name}</div>
          )}
          <div className="help-text">
            Choose a descriptive name that helps you identify this backup configuration.
          </div>
        </div>
      )
    },
    {
      title: 'Rclone Binary',
      description: 'Select your rclone installation',
      content: (
        <div className="form-group">
          <label htmlFor="rclone-bin">Rclone Binary Path</label>
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
              placeholder="Custom path to rclone binary"
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
            If rclone is not installed, please install it first from{' '}
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
      title: 'Rclone Config',
      description: 'Select your rclone configuration file',
      content: (
        <div className="form-group">
          <label htmlFor="rclone-conf">Rclone Config File</label>
          <div className="file-input">
            <input
              id="rclone-conf"
              type="text"
              value={formData.rclone_conf}
              onChange={(e) => setFormData(prev => ({ ...prev, rclone_conf: e.target.value }))}
              placeholder="Path to rclone.conf"
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
            Select the rclone.conf file that contains your cloud storage credentials.
            Usually located at ~/.config/rclone/rclone.conf
          </div>
        </div>
      )
    },
    {
      title: 'Cloud Storage',
      description: 'Configure your cloud storage destination',
      content: (
        <div className="form-groups">
          <div className="form-group">
            <label htmlFor="remote">Remote Name</label>
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
            <label htmlFor="bucket">Bucket Name</label>
            <input
              id="bucket"
              type="text"
              value={formData.bucket}
              onChange={(e) => setFormData(prev => ({ ...prev, bucket: e.target.value }))}
              placeholder="my-backup-bucket"
              className={validationErrors.bucket ? 'error' : ''}
            />
            {validationErrors.bucket && (
              <div className="error-message">{validationErrors.bucket}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="prefix">Prefix</label>
            <input
              id="prefix"
              type="text"
              value={formData.prefix}
              onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
              placeholder="user-backups"
              className={validationErrors.prefix ? 'error' : ''}
            />
            {validationErrors.prefix && (
              <div className="error-message">{validationErrors.prefix}</div>
            )}
            <div className="help-text">
              All backups will be stored under: {formData.bucket}/{formData.prefix}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Source Folders',
      description: 'Select folders to backup',
      content: (
        <div className="form-group">
          <label>Source Folders</label>
          <div className="sources-list">
            {formData.sources.map((source, index) => (
              <div key={index} className="source-item">
                <input
                  type="text"
                  value={source}
                  onChange={(e) => updateSource(index, e.target.value)}
                  placeholder="Path to folder"
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
            Add Folder
          </button>
          {validationErrors.sources && (
            <div className="error-message">{validationErrors.sources}</div>
          )}
        </div>
      )
    },
    {
      title: 'Backup Mode',
      description: 'Choose how backups should work',
      content: (
        <div className="form-group">
          <label>Backup Mode</label>
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
                  Copy Mode (Recommended)
                </div>
                <div className="option-description">
                  Only copies new and changed files to the cloud. Never deletes files from the cloud.
                  Safe for daily automated backups.
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
                  Sync Mode (Advanced)
                </div>
                <div className="option-description">
                  Makes the cloud exactly match your local folders. May delete files from the cloud.
                  Requires confirmation before running.
                </div>
              </div>
            </label>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="onboarding">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h1>Setup Cloud Backup</h1>
          <div className="step-indicator">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="onboarding-content">
          <div className="step-header">
            <h2>{currentStepData.title}</h2>
            <p>{currentStepData.description}</p>
          </div>

          <div className="step-content">
            {currentStepData.content}
          </div>
        </div>

        <div className="onboarding-actions">
          <div className="actions-left">
            {currentStep > 0 && (
              <button 
                className="btn btn-secondary"
                onClick={prevStep}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
          </div>

          <div className="actions-right">
            {currentStep < steps.length - 1 ? (
              <button 
                className="btn btn-primary"
                onClick={nextStep}
                disabled={isValidating}
              >
                {isValidating ? 'Validating...' : 'Next'}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={handleCreateProfile}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Profile'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}