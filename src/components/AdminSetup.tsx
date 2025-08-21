import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { Profile, AwsConfig, LifecycleConfig } from '../types';

interface AdminSetupProps {
  onSetupComplete: (profile: Profile) => void;
  onCancel: () => void;
}

interface SetupData {
  aws_access_key_id: string;
  aws_secret_access_key: string;
  admin_username: string;
  bucket_name: string;
  aws_region: string;
  lifecycle_config: LifecycleConfig;
  employees: string[];
}

export default function AdminSetup({ onSetupComplete, onCancel }: AdminSetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<SetupData>({
    aws_access_key_id: '',
    aws_secret_access_key: '',
    admin_username: '',
    bucket_name: '',
    aws_region: 'us-east-1',
    lifecycle_config: {
      enabled: true,
      days_to_ia: 30,
      days_to_glacier: 90
    },
    employees: []
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [awsConfigured, setAwsConfigured] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkExistingAWS();
  }, []);

  const checkExistingAWS = async () => {
    try {
      const isConfigured = await invoke<boolean>('check_aws_credentials');
      setAwsConfigured(isConfigured);
    } catch (error) {
      console.error('Error checking AWS credentials:', error);
    }
  };

  const configureAWS = async () => {
    console.log('Configure AWS button clicked');
    const errors: Record<string, string> = {};

    if (!setupData.aws_access_key_id) errors.aws_access_key_id = 'AWS Access Key ID is required';
    if (!setupData.aws_secret_access_key) errors.aws_secret_access_key = 'AWS Secret Access Key is required';

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
      return;
    }

    console.log('Starting AWS configuration...');
    setIsConfiguring(true);
    try {
      console.log('Calling configure_aws_credentials with region:', setupData.aws_region);
      console.log('Access key length:', setupData.aws_access_key_id.length);
      console.log('Secret key length:', setupData.aws_secret_access_key.length);
      
      // const result = await invoke<string>('configure_aws_credentials', {
      //   access_key_id: setupData.aws_access_key_id,
      //   secret_access_key: setupData.aws_secret_access_key,
      //   region: setupData.aws_region,
      //   profile_name: 'lavoz-cloud-app-test' // TODO: Pass in user name
      // });
      const payload = {
        accessKeyId: setupData.aws_access_key_id,
        secretAccessKey: setupData.aws_secret_access_key,
        region: setupData.aws_region,
        profileName: 'lavoz-cloud-app-test' // TODO: Pass in user name     
      };
      console.log(payload);
      const result = await invoke<string>('configure_aws_credentials', payload);

      console.log('AWS credentials configured successfully, result:', result);
      setAwsConfigured(true);
      alert('SUCCESS! Backend response: ' + result);
    } catch (error) {
      console.error('AWS configuration failed with error:', error);
      console.error('Error type:', typeof error);
      console.error('Error object:', JSON.stringify(error, null, 2));
      alert('AWS configuration failed: ' + JSON.stringify(error));
    } finally {
      setIsConfiguring(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Infrastructure settings
        if (!setupData.admin_username) errors.admin_username = 'Admin username is required';
        if (!setupData.bucket_name) errors.bucket_name = 'Bucket name is required';
        break;
      case 2: // Employees
        if (setupData.employees.length === 0) errors.employees = 'At least one employee is required';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (currentStep === 0 && !awsConfigured) {
      alert('Please configure AWS credentials first');
      return;
    }

    if (currentStep > 0 && !validateStep(currentStep)) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addEmployee = () => {
    setSetupData(prev => ({
      ...prev,
      employees: [...prev.employees, '']
    }));
  };

  const updateEmployee = (index: number, value: string) => {
    setSetupData(prev => ({
      ...prev,
      employees: prev.employees.map((emp, i) => i === index ? value : emp)
    }));
  };

  const removeEmployee = (index: number) => {
    setSetupData(prev => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index)
    }));
  };

  const setupInfrastructure = async () => {
    if (!validateStep(currentStep)) return;

    setIsConfiguring(true);
    try {
      // Filter out empty employee names
      const employees = setupData.employees.filter(emp => emp.trim() !== '');
      
      const awsConfig = await invoke<AwsConfig>('setup_aws_infrastructure', {
        bucketName: setupData.bucket_name,
        region: setupData.aws_region,
        adminUsername: setupData.admin_username,
        lifecycleConfig: setupData.lifecycle_config,
        employees,
        profileName: 'lavoz-cloud-app-test'
      });

      // Create admin profile
      const profile = await invoke<Profile>('create_profile', {
        name: `${setupData.admin_username} (Admin)`,
        profileType: 'Admin'
      });

      // Update profile with AWS config
      const updatedProfile = {
        ...profile,
        bucket: setupData.bucket_name,
        prefix: 'admin',
        aws_config: awsConfig
      };

      await invoke('update_profile', { profile: updatedProfile });
      await invoke('set_active_profile', { profileId: profile.id });

      onSetupComplete(updatedProfile);
    } catch (error) {
      console.error('Infrastructure setup failed:', error);
      alert('Infrastructure setup failed: ' + error);
    } finally {
      setIsConfiguring(false);
    }
  };

  const steps = [
    {
      title: 'AWS Credentials',
      description: 'Configure your AWS access credentials for admin operations',
      content: (
        <div className="space-y-6">
          {awsConfigured ? (
            <div className="success-message">
              <CheckCircle size={20} />
              <span>AWS credentials are configured and validated</span>
            </div>
          ) : (
            <>
              <div className="info-box">
                <AlertCircle size={16} />
                <div>
                  <strong>Admin AWS Credentials Required</strong>
                  <p>You need AWS credentials with administrative permissions to create S3 buckets, IAM users, and policies. These credentials will be used to set up the backup infrastructure for your organization.</p>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="aws-access-key-id">AWS Access Key ID</label>
                <input
                  id="aws-access-key-id"
                  type="text"
                  value={setupData.aws_access_key_id}
                  onChange={(e) => setSetupData(prev => ({ ...prev, aws_access_key_id: e.target.value }))}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className={validationErrors.aws_access_key_id ? 'error' : ''}
                />
                {validationErrors.aws_access_key_id && (
                  <div className="error-message">{validationErrors.aws_access_key_id}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="aws-secret-access-key">AWS Secret Access Key</label>
                <input
                  id="aws-secret-access-key"
                  type="password"
                  value={setupData.aws_secret_access_key}
                  onChange={(e) => setSetupData(prev => ({ ...prev, aws_secret_access_key: e.target.value }))}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className={validationErrors.aws_secret_access_key ? 'error' : ''}
                />
                {validationErrors.aws_secret_access_key && (
                  <div className="error-message">{validationErrors.aws_secret_access_key}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="aws-region">AWS Region</label>
                <select
                  id="aws-region"
                  value={setupData.aws_region}
                  onChange={(e) => setSetupData(prev => ({ ...prev, aws_region: e.target.value }))}
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>

              <div className="security-note">
                <h4>Security Notes:</h4>
                <ul>
                  <li>Your credentials are stored securely using AWS CLI configuration</li>
                  <li>We recommend using IAM credentials with only the necessary permissions</li>
                  <li>Consider enabling MFA on your AWS account for additional security</li>
                </ul>
              </div>

              <button 
                className="btn btn-primary"
                onClick={configureAWS}
                disabled={isConfiguring}
              >
                {isConfiguring ? 'Validating...' : 'Configure & Validate Credentials'}
              </button>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Infrastructure Settings',
      description: 'Configure your S3 bucket and storage settings',
      content: (
        <div className="space-y-6">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="admin-username">Admin Username</label>
              <input
                id="admin-username"
                type="text"
                value={setupData.admin_username}
                onChange={(e) => setSetupData(prev => ({ ...prev, admin_username: e.target.value.toLowerCase() }))}
                placeholder="backup-admin"
                className={validationErrors.admin_username ? 'error' : ''}
              />
              {validationErrors.admin_username && (
                <div className="error-message">{validationErrors.admin_username}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="bucket-name">S3 Bucket Name</label>
              <input
                id="bucket-name"
                type="text"
                value={setupData.bucket_name}
                onChange={(e) => setSetupData(prev => ({ ...prev, bucket_name: e.target.value.toLowerCase() }))}
                placeholder="my-company-backups"
                className={validationErrors.bucket_name ? 'error' : ''}
              />
              {validationErrors.bucket_name && (
                <div className="error-message">{validationErrors.bucket_name}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="aws-region">AWS Region</label>
            <select
              id="aws-region"
              value={setupData.aws_region}
              onChange={(e) => setSetupData(prev => ({ ...prev, aws_region: e.target.value }))}
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">Europe (Ireland)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Storage Lifecycle Policy</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={setupData.lifecycle_config.enabled}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    lifecycle_config: { ...prev.lifecycle_config, enabled: e.target.checked }
                  }))}
                />
                <span>Enable automatic storage optimization</span>
              </label>
            </div>

            {setupData.lifecycle_config.enabled && (
              <div className="form-row mt-4">
                <div className="form-group">
                  <label htmlFor="days-to-ia">Days to Standard-IA</label>
                  <input
                    id="days-to-ia"
                    type="number"
                    min="1"
                    value={setupData.lifecycle_config.days_to_ia}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      lifecycle_config: { ...prev.lifecycle_config, days_to_ia: parseInt(e.target.value) }
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="days-to-glacier">Days to Glacier</label>
                  <select
                    id="days-to-glacier"
                    value={setupData.lifecycle_config.days_to_glacier === 999999 ? 'never' : setupData.lifecycle_config.days_to_glacier.toString()}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      lifecycle_config: { 
                        ...prev.lifecycle_config, 
                        days_to_glacier: e.target.value === 'never' ? 999999 : parseInt(e.target.value) 
                      }
                    }))}
                  >
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                    <option value="never">Never (Keep in Standard-IA)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Employee Setup',
      description: 'Add employees who will have backup access',
      content: (
        <div className="space-y-6">
          <div className="form-group">
            <label>Employees</label>
            <div className="employees-list">
              {setupData.employees.map((employee, index) => (
                <div key={index} className="employee-item">
                  <input
                    type="text"
                    value={employee}
                    onChange={(e) => updateEmployee(index, e.target.value.toLowerCase())}
                    placeholder="Employee username (e.g., john-doe)"
                  />
                  <button
                    type="button"
                    className="btn-icon danger"
                    onClick={() => removeEmployee(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={addEmployee}
            >
              <Plus size={16} />
              Add Employee
            </button>

            {validationErrors.employees && (
              <div className="error-message">{validationErrors.employees}</div>
            )}

            <div className="help-text">
              Each employee will get their own IAM user with access only to their folder in the bucket.
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Review & Setup',
      description: 'Review your configuration and create the infrastructure',
      content: (
        <div className="space-y-6">
          <div className="review-section">
            <h3>Configuration Summary</h3>
            
            <div className="review-item">
              <strong>Admin Username:</strong> {setupData.admin_username}
            </div>
            
            <div className="review-item">
              <strong>S3 Bucket:</strong> {setupData.bucket_name} ({setupData.aws_region})
            </div>
            
            <div className="review-item">
              <strong>Lifecycle Policy:</strong> {setupData.lifecycle_config.enabled ? 'Enabled' : 'Disabled'}
              {setupData.lifecycle_config.enabled && (
                <div className="sub-items">
                  <div>Standard-IA after {setupData.lifecycle_config.days_to_ia} days</div>
                  <div>Glacier: {setupData.lifecycle_config.days_to_glacier === 999999 ? 'Never' : `after ${setupData.lifecycle_config.days_to_glacier} days`}</div>
                </div>
              )}
            </div>
            
            <div className="review-item">
              <strong>Employees ({setupData.employees.filter(e => e.trim()).length}):</strong>
              <div className="sub-items">
                {setupData.employees.filter(e => e.trim()).map((emp, idx) => (
                  <div key={idx}>{emp}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="warning-box">
            <AlertCircle size={16} />
            <div>
              <strong>Important:</strong> This will create AWS resources that may incur costs. 
              The setup will create IAM users, policies, and configure your S3 bucket.
            </div>
          </div>

          <button 
            className="btn btn-primary btn-large"
            onClick={setupInfrastructure}
            disabled={isConfiguring}
          >
            {isConfiguring ? 'Setting up infrastructure...' : 'Create Infrastructure'}
          </button>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="admin-setup">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Admin Setup</h1>
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
            {currentStep < steps.length - 1 && (
              <button 
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}