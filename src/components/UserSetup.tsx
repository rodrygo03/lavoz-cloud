import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import {
  Key,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { Profile, BackupMode } from '../types';
import UserSetupView, { type StepData } from './UserSetupView';

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
}

export default function UserSetup({ onSetupComplete, onCancel }: UserSetupProps) {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<UserFormData>({
    profile_name: '',
    access_key_id: '',
    secret_access_key: '',
    region: 'us-east-1',
    bucket: '',
    username: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(false);
  const [credentialsValidated, setCredentialsValidated] = useState(false);

  const validateCredentials = async () => {
    setIsValidatingCredentials(true);
    try {
      const payload = {
        accessKeyId: formData.access_key_id,
        secretAccessKey: formData.secret_access_key,
        region: formData.region,
        profileName: `${formData.profile_name}-validation`
      };

      console.log('Validating AWS credentials for user...');
      const result = await invoke<string>('configure_aws_credentials', payload);

      console.log('User credentials validated successfully:', result);
      setCredentialsValidated(true);
      alert(t('userSetup.credentialsValidated') || '✅ Credentials validated successfully!');
    } catch (error) {
      console.error('Credential validation failed:', error);
      setCredentialsValidated(false);
      alert(t('userSetup.credentialsValidationFailed') || '❌ Credential validation failed: ' + error);
    } finally {
      setIsValidatingCredentials(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 0: // Profile name
        if (!formData.profile_name.trim()) errors.profile_name = t('onboarding.profileNameRequired');
        break;
      case 1: // AWS credentials
        if (!formData.access_key_id.trim()) errors.access_key_id = t('adminSetup.awsAccessKeyIdRequired');
        if (!formData.secret_access_key.trim()) errors.secret_access_key = t('adminSetup.awsSecretAccessKeyRequired');
        if (!formData.bucket.trim()) errors.bucket = t('onboarding.bucketNameRequired');
        if (!formData.username.trim()) errors.username = t('userSetup.usernameRequired');
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;

    // For AWS credentials step, require validation
    if (currentStep === 1 && !credentialsValidated) {
      alert(t('userSetup.pleaseValidateCredentials') || 'Please validate your AWS credentials first');
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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

      // Create config file path
      const configPath = `user-${profile.id}-rclone.conf`;

      try {
        // Save rclone config file
        await invoke('write_text_file', {
          path: configPath,
          contents: rcloneConfig
        });
        console.log('✅ Rclone config auto-generated and saved to:', configPath);
      } catch (writeError) {
        console.error('❌ Failed to write rclone config file:', writeError);
      }

      // Create AWS config structure
      const awsConfig = {
        aws_access_key_id: formData.access_key_id,
        aws_secret_access_key: formData.secret_access_key,
        aws_region: formData.region,
        aws_sso_configured: false,
        bucket_name: formData.bucket,
        lifecycle_config: {
          enabled: false,
          days_to_ia: 30,
          days_to_glacier: 365
        },
        employees: []
      };

      // Create user profile with proper AWS config and rclone configuration
      const updatedProfile = {
        ...profile,
        bucket: formData.bucket,
        prefix: formData.username,
        remote: 'aws',
        sources: [],
        mode: 'Copy' as BackupMode,
        rclone_bin: 'rclone',
        rclone_conf: configPath,
        rclone_flags: [
          '--checksum',
          '--fast-list',
          '--transfers=8',
          '--checkers=32'
        ],
        aws_config: awsConfig
      };

      await invoke('update_profile', { profile: updatedProfile });
      await invoke('set_active_profile', { profileId: profile.id });

      onSetupComplete(updatedProfile);
    } catch (error) {
      console.error('Failed to create profile:', error);
      alert('Failed to create profile: ' + error);
    } finally {
      setIsCreating(false);
    }
  };

  const steps: StepData[] = [
    {
      title: t('userSetup.profileName'),
      description: t('userSetup.profileNameDescription'),
      content: (
        <div className="form-group">
          <label htmlFor="profile-name">{t('userSetup.profileName')}</label>
          <input
            id="profile-name"
            type="text"
            value={formData.profile_name}
            onChange={(e) => setFormData(prev => ({ ...prev, profile_name: e.target.value }))}
            placeholder={t('userSetup.profileNamePlaceholder')}
            className={validationErrors.profile_name ? 'error' : ''}
          />
          {validationErrors.profile_name && (
            <div className="error-message">{validationErrors.profile_name}</div>
          )}
          <div className="help-text">
            {t('userSetup.profileNameHelp')}
          </div>
        </div>
      )
    },
    {
      title: t('userSetup.awsCredentials'),
      description: t('userSetup.awsCredentialsDescription'),
      content: (
        <div className="space-y-6">
          <div className="info-box">
            <Key size={16} />
            <div>
              <strong>{t('userSetup.credentialsRequired')}</strong> {t('userSetup.credentialsInfo')}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="access-key">{t('adminSetup.awsAccessKeyId')}</label>
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
            <label htmlFor="secret-key">{t('adminSetup.awsSecretAccessKey')}</label>
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
              <label htmlFor="region">{t('adminSetup.awsRegion')}</label>
              <select
                id="region"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
              >
                <option value="us-east-1">{t('adminSetup.usEastVirginia')}</option>
                <option value="us-west-2">{t('adminSetup.usWestOregon')}</option>
                <option value="eu-west-1">{t('adminSetup.europeIreland')}</option>
                <option value="ap-southeast-1">{t('adminSetup.asiaSeattle')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bucket">{t('adminSetup.s3BucketName')}</label>
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
            <label htmlFor="username">{t('userSetup.yourUsername')}</label>
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
              {t('userSetup.usernameHelp')}
            </div>
          </div>

          {/* Credential Validation Section */}
          <div className="validation-section">
            <div className="validation-header">
              <h3>{t('userSetup.validateCredentials') || 'Validate AWS Credentials'}</h3>
              <p>{t('userSetup.validateCredentialsDesc') || 'Verify your AWS credentials before proceeding'}</p>
            </div>

            <div className="validation-actions">
              <button
                type="button"
                className={`btn ${credentialsValidated ? 'btn-success' : 'btn-primary'}`}
                onClick={validateCredentials}
                disabled={isValidatingCredentials || !formData.access_key_id || !formData.secret_access_key}
              >
                {isValidatingCredentials ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    {t('adminSetup.validating') || 'Validating...'}
                  </>
                ) : credentialsValidated ? (
                  <>
                    <CheckCircle size={16} />
                    {t('userSetup.credentialsValidated') || 'Credentials Validated'}
                  </>
                ) : (
                  t('userSetup.validateCredentials') || 'Validate Credentials'
                )}
              </button>

              {credentialsValidated && (
                <div className="validation-success">
                  <CheckCircle size={20} className="text-green" />
                  <span>{t('adminSetup.credentialsConfigured') || 'AWS credentials are configured and validated'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }
  ];

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
    <UserSetupView
      currentStep={currentStep}
      steps={steps}
      isCreating={isCreating}
      languageToggle={languageToggle}
      onNextStep={nextStep}
      onPrevStep={prevStep}
      onCancel={onCancel}
      onCreateProfile={createProfile}
      t={t}
    />
  );
}
