import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ConfigSetupProps {
  onConfigComplete: () => void;
}

interface AppConfiguration {
  cognito_user_pool_id: string;
  cognito_app_client_id: string;
  cognito_identity_pool_id: string;
  cognito_region: string;
  bucket_name: string;
  lambda_api_url?: string;
}

export default function ConfigSetup({ onConfigComplete }: ConfigSetupProps) {
  const { i18n } = useTranslation();
  const [configMethod, setConfigMethod] = useState<'manual' | 'json' | null>(null);
  const [config, setConfig] = useState<AppConfiguration>({
    cognito_user_pool_id: '',
    cognito_app_client_id: '',
    cognito_identity_pool_id: '',
    cognito_region: 'us-east-1',
    bucket_name: '',
    lambda_api_url: ''
  });
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      // Validate required fields
      const required = ['cognito_user_pool_id', 'cognito_app_client_id', 'cognito_identity_pool_id', 'cognito_region', 'bucket_name'];
      const missing = required.filter(field => !parsed[field]);

      if (missing.length > 0) {
        setError(`Missing required fields: ${missing.join(', ')}`);
        return;
      }

      setConfig(parsed);
      setError('');
      setConfigMethod('manual'); // Switch to manual view to show populated fields
    } catch (e) {
      setError('Invalid JSON format. Please check your configuration.');
    }
  };

  const handleSaveConfig = async () => {
    // Validate all fields
    if (!config.cognito_user_pool_id || !config.cognito_app_client_id ||
        !config.cognito_identity_pool_id || !config.bucket_name) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Save to localStorage for now (will be replaced with Tauri command)
      localStorage.setItem('app_config', JSON.stringify({
        ...config,
        is_configured: true
      }));

      setTimeout(() => {
        onConfigComplete();
      }, 500);
    } catch (e) {
      setError('Failed to save configuration. Please try again.');
      setSaving(false);
    }
  };

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

  if (!configMethod) {
    return (
      <div className="setup-type-selection">
        <div className="selection-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
            <div></div>
            <LanguageToggle />
          </div>

          <h1>Welcome to Cloud Backup</h1>
          <p>First, let's configure your app to connect to AWS</p>

          <div className="setup-options">
            <div className="setup-option" onClick={() => setConfigMethod('json')}>
              <div className="option-icon">📋</div>
              <h3>Import Configuration</h3>
              <p>Paste your configuration JSON provided by your administrator</p>
              <button className="btn btn-primary">Import JSON</button>
            </div>

            <div className="setup-option" onClick={() => setConfigMethod('manual')}>
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
              onClick={() => setConfigMethod(null)}
            >
              ← Back
            </button>
            <LanguageToggle />
          </div>

          <h1>Import Configuration</h1>
          <p>Paste the JSON configuration provided by your administrator</p>

          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label htmlFor="json-config">Configuration JSON</label>
            <textarea
              id="json-config"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
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
            onClick={handleJsonImport}
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
            onClick={() => {
              setConfigMethod(null);
              setConfig({
                cognito_user_pool_id: '',
                cognito_app_client_id: '',
                cognito_identity_pool_id: '',
                cognito_region: 'us-east-1',
                bucket_name: '',
                lambda_api_url: ''
              });
            }}
          >
            ← Back
          </button>
          <LanguageToggle />
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
              onChange={(e) => setConfig(prev => ({ ...prev, cognito_user_pool_id: e.target.value }))}
              placeholder="us-east-1_XXXXXXXXX"
            />
          </div>

          <div className="form-group">
            <label htmlFor="app-client-id">Cognito App Client ID</label>
            <input
              id="app-client-id"
              type="text"
              value={config.cognito_app_client_id}
              onChange={(e) => setConfig(prev => ({ ...prev, cognito_app_client_id: e.target.value }))}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="form-group">
            <label htmlFor="identity-pool-id">Cognito Identity Pool ID</label>
            <input
              id="identity-pool-id"
              type="text"
              value={config.cognito_identity_pool_id}
              onChange={(e) => setConfig(prev => ({ ...prev, cognito_identity_pool_id: e.target.value }))}
              placeholder="us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="form-group">
            <label htmlFor="region">AWS Region</label>
            <select
              id="region"
              value={config.cognito_region}
              onChange={(e) => setConfig(prev => ({ ...prev, cognito_region: e.target.value }))}
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
              onChange={(e) => setConfig(prev => ({ ...prev, bucket_name: e.target.value }))}
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
              onChange={(e) => setConfig(prev => ({ ...prev, lambda_api_url: e.target.value }))}
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
            onClick={handleSaveConfig}
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
