import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  ArrowRight, 
  ArrowLeft, 
  Key, 
  Folder,
  CheckCircle
} from 'lucide-react';
import { Profile, BackupMode } from '../types';

interface UserSetupProps {
  onSetupComplete: (profile: Profile) => void;
  onCancel: () => void;
}

interface UserFormData {
  profile_name: string;
  access_key_id: string;
  secret_access_key: string;
  region: string;
  bucket: string;
  username: string;
  rclone_bin: string;
  sources: string[];
  mode: BackupMode;
}

export default function UserSetup({ onSetupComplete, onCancel }: UserSetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<UserFormData>({
    profile_name: '',
    access_key_id: '',
    secret_access_key: '',
    region: 'us-east-1',
    bucket: '',
    username: '',
    rclone_bin: '',
    sources: [],
    mode: 'Copy'
  });
  const [rcloneCandidates, setRcloneCandidates] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

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

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 0: // Profile name
        if (!formData.profile_name.trim()) errors.profile_name = 'Profile name is required';
        break;
      case 1: // AWS credentials
        if (!formData.access_key_id.trim()) errors.access_key_id = 'Access Key ID is required';
        if (!formData.secret_access_key.trim()) errors.secret_access_key = 'Secret Access Key is required';
        if (!formData.bucket.trim()) errors.bucket = 'Bucket name is required';
        if (!formData.username.trim()) errors.username = 'Username is required';
        break;
      case 2: // Rclone setup
        if (!formData.rclone_bin.trim()) errors.rclone_bin = 'Rclone binary path is required';
        break;
      case 3: // Source folders
        if (formData.sources.length === 0) errors.sources = 'At least one source folder is required';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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

  const createProfile = async () => {
    if (!validateStep(currentStep)) return;

    setIsCreating(true);
    try {
      // Create user profile
      const profile = await invoke<Profile>('create_profile', {
        name: formData.profile_name,
        profileType: 'User'
      });

      // Generate rclone config content
      const rcloneConfig = `[aws]
type = s3
provider = AWS
env_auth = false
access_key_id = ${formData.access_key_id}
secret_access_key = ${formData.secret_access_key}
region = ${formData.region}
acl = private
`;

      // Create temporary rclone config file
      const configPath = `/tmp/rclone-${profile.id}.conf`;
      
      // Update profile with configuration
      const updatedProfile = {
        ...profile,
        rclone_bin: formData.rclone_bin,
        rclone_conf: configPath,
        bucket: formData.bucket,
        prefix: formData.username,
        sources: formData.sources.filter(s => s.trim() !== ''),
        mode: formData.mode,
        rclone_flags: [
          '--checksum',
          '--fast-list',
          '--transfers=8',
          '--checkers=32'
        ]
      };

      await invoke('update_profile', { profile: updatedProfile });
      await invoke('set_active_profile', { profileId: profile.id });

      // Save rclone config to file (in a real app, you'd use proper file handling)
      console.log('Rclone config to save:', rcloneConfig);
      
      onSetupComplete(updatedProfile);
    } catch (error) {
      console.error('Failed to create profile:', error);
      alert('Failed to create profile: ' + error);
    } finally {
      setIsCreating(false);
    }
  };

  const openFolderDialog = (callback: (path: string) => void) => {
    const path = prompt('Enter folder path:');
    if (path) {
      callback(path);
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
            value={formData.profile_name}
            onChange={(e) => setFormData(prev => ({ ...prev, profile_name: e.target.value }))}
            placeholder="My Work Backup"
            className={validationErrors.profile_name ? 'error' : ''}
          />
          {validationErrors.profile_name && (
            <div className="error-message">{validationErrors.profile_name}</div>
          )}
          <div className="help-text">
            Choose a descriptive name for your backup configuration.
          </div>
        </div>
      )
    },
    {
      title: 'AWS Credentials',
      description: 'Enter the credentials provided by your administrator',
      content: (
        <div className="space-y-6">
          <div className="info-box">
            <Key size={16} />
            <div>
              <strong>Credentials Required:</strong> Your administrator should have provided you with 
              AWS credentials and bucket information. If you don't have these, please contact your admin.
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="access-key">AWS Access Key ID</label>
            <input
              id="access-key"
              type="text"
              value={formData.access_key_id}
              onChange={(e) => setFormData(prev => ({ ...prev, access_key_id: e.target.value }))}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              className={validationErrors.access_key_id ? 'error' : ''}
            />
            {validationErrors.access_key_id && (
              <div className="error-message">{validationErrors.access_key_id}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="secret-key">AWS Secret Access Key</label>
            <input
              id="secret-key"
              type="password"
              value={formData.secret_access_key}
              onChange={(e) => setFormData(prev => ({ ...prev, secret_access_key: e.target.value }))}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              className={validationErrors.secret_access_key ? 'error' : ''}
            />
            {validationErrors.secret_access_key && (
              <div className="error-message">{validationErrors.secret_access_key}</div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="region">AWS Region</label>
              <select
                id="region"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bucket">S3 Bucket Name</label>
              <input
                id="bucket"
                type="text"
                value={formData.bucket}
                onChange={(e) => setFormData(prev => ({ ...prev, bucket: e.target.value.toLowerCase() }))}
                placeholder="company-backups"
                className={validationErrors.bucket ? 'error' : ''}
              />
              {validationErrors.bucket && (
                <div className="error-message">{validationErrors.bucket}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Your Username</label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
              placeholder="john-doe"
              className={validationErrors.username ? 'error' : ''}
            />
            {validationErrors.username && (
              <div className="error-message">{validationErrors.username}</div>
            )}
            <div className="help-text">
              This should match the username your admin created for you.
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Rclone Setup',
      description: 'Configure the rclone tool for file synchronization',
      content: (
        <div className="space-y-6">
          <div className="form-group">
            <label>Rclone Binary Path</label>
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
          </div>
        </div>
      )
    },
    {
      title: 'Source Folders',
      description: 'Select the folders you want to backup',
      content: (
        <div className="space-y-6">
          <div className="form-group">
            <label>Folders to Backup</label>
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

          <div className="form-group">
            <label>Backup Mode</label>
            <div className="radio-group">
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
                    Only copies new and changed files. Never deletes files from the cloud.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="user-setup">
      <div className="setup-container">
        <div className="setup-header">
          <h1>User Setup</h1>
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

        <div className="setup-content">
          <div className="step-header">
            <h2>{currentStepData.title}</h2>
            <p>{currentStepData.description}</p>
          </div>

          <div className="step-content">
            {currentStepData.content}
          </div>
        </div>

        <div className="setup-actions">
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
            
            <button 
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>

          <div className="actions-right">
            {currentStep < steps.length - 1 ? (
              <button 
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={createProfile}
                disabled={isCreating}
              >
                {isCreating ? 'Creating Profile...' : 'Create Profile'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}