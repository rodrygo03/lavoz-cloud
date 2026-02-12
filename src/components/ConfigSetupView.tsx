import { ReactNode } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export interface AppConfiguration {
  cognito_user_pool_id: string;
  cognito_app_client_id: string;
  cognito_identity_pool_id: string;
  cognito_region: string;
  bucket_name: string;
  lambda_api_url?: string;
}

export interface ConfigSetupViewProps {
  configMethod: 'manual' | 'json' | null;
  config: AppConfiguration;
  jsonInput: string;
  error: string;
  saving: boolean;
  languageToggle: ReactNode;

  // Actions
  onSetConfigMethod: (method: 'manual' | 'json' | null) => void;
  onConfigChange: (field: keyof AppConfiguration, value: string) => void;
  onJsonInputChange: (value: string) => void;
  onJsonImport: () => void;
  onSaveConfig: () => void;
  onResetConfig: () => void;

  // i18n (not used heavily but kept for consistency)
}

export default function ConfigSetupView({
  configMethod,
  config,
  jsonInput,
  error,
  saving,
  languageToggle,
  onSetConfigMethod,
  onConfigChange,
  onJsonInputChange,
  onJsonImport,
  onSaveConfig,
  onResetConfig,
}: ConfigSetupViewProps) {
  if (!configMethod) {
    return (
      <div className="setup-type-selection">
        <div className="selection-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
            <div></div>
            {languageToggle}
          </div>

          <h1>Welcome to Cloud Backup</h1>
          <p>First, let's configure your app to connect to AWS</p>

          <div className="setup-options">
            <div className="setup-option" onClick={() => onSetConfigMethod('json')}>
              <div className="option-icon">📋</div>
              <h3>Import Configuration</h3>
              <p>Paste your configuration JSON provided by your administrator</p>
              <button className="btn btn-primary">Import JSON</button>
            </div>

            <div className="setup-option" onClick={() => onSetConfigMethod('manual')}>
              <div className="option-icon">⚙️</div>
              <h3>Manual Entry</h3>
              <p>Enter configuration values manually</p>
              <button className="btn btn-secondary">Enter Manually</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (configMethod === 'json' && !config.cognito_user_pool_id) {
    return (
      <div className="setup-type-selection">
        <div className="selection-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => onSetConfigMethod(null)}
            >
              ← Back
            </button>
            {languageToggle}
          </div>

          <h1>Import Configuration</h1>
          <p>Paste the JSON configuration provided by your administrator</p>

          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label htmlFor="json-config">Configuration JSON</label>
            <textarea
              id="json-config"
              value={jsonInput}
              onChange={(e) => onJsonInputChange(e.target.value)}
              placeholder={`{
  "cognito_user_pool_id": "us-east-1_XXXXX",
  "cognito_app_client_id": "xxxxxxxxx",
  "cognito_identity_pool_id": "us-east-1:xxxx-yyyy",
  "cognito_region": "us-east-1",
  "bucket_name": "company-backups",
  "lambda_api_url": "https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/create-user"
}`}
              rows={12}
              style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                width: '100%',
                padding: '12px'
              }}
            />
          </div>

          {error && (
            <div className="error-message" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={onJsonImport}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            Import and Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-type-selection">
      <div className="selection-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
          <button
            className="btn btn-secondary"
            onClick={onResetConfig}
          >
            ← Back
          </button>
          {languageToggle}
        </div>

        <h1>App Configuration</h1>
        <p>Enter your AWS Cognito and S3 configuration details</p>

        <div className="info-box" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <AlertCircle size={16} />
          <div>
            <strong>Administrator Setup Required</strong>
            <p>These values should be provided by your system administrator. They are set up once and used by all employees.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="form-group">
            <label htmlFor="user-pool-id">Cognito User Pool ID</label>
            <input
              id="user-pool-id"
              type="text"
              value={config.cognito_user_pool_id}
              onChange={(e) => onConfigChange('cognito_user_pool_id', e.target.value)}
              placeholder="us-east-1_XXXXXXXXX"
            />
          </div>

          <div className="form-group">
            <label htmlFor="app-client-id">Cognito App Client ID</label>
            <input
              id="app-client-id"
              type="text"
              value={config.cognito_app_client_id}
              onChange={(e) => onConfigChange('cognito_app_client_id', e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="form-group">
            <label htmlFor="identity-pool-id">Cognito Identity Pool ID</label>
            <input
              id="identity-pool-id"
              type="text"
              value={config.cognito_identity_pool_id}
              onChange={(e) => onConfigChange('cognito_identity_pool_id', e.target.value)}
              placeholder="us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="form-group">
            <label htmlFor="region">AWS Region</label>
            <select
              id="region"
              value={config.cognito_region}
              onChange={(e) => onConfigChange('cognito_region', e.target.value)}
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">Europe (Ireland)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="bucket-name">S3 Bucket Name</label>
            <input
              id="bucket-name"
              type="text"
              value={config.bucket_name}
              onChange={(e) => onConfigChange('bucket_name', e.target.value)}
              placeholder="company-backups"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lambda-api-url">
              Lambda API URL <span style={{ color: '#888', fontSize: '12px' }}>(Optional - for scheduled backups)</span>
            </label>
            <input
              id="lambda-api-url"
              type="text"
              value={config.lambda_api_url || ''}
              onChange={(e) => onConfigChange('lambda_api_url', e.target.value)}
              placeholder="https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/create-user"
            />
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              Leave blank if you only need manual backups. Required for scheduled backups.
            </small>
          </div>

          {error && (
            <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-large"
            onClick={onSaveConfig}
            disabled={saving}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {saving ? (
              <>
                <div className="loading-spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                Saving Configuration...
              </>
            ) : (
              <>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
