import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfigSetupView, { type AppConfiguration } from './ConfigSetupView';

interface ConfigSetupProps {
  onConfigComplete: () => void;
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

  const handleResetConfig = () => {
    setConfigMethod(null);
    setConfig({
      cognito_user_pool_id: '',
      cognito_app_client_id: '',
      cognito_identity_pool_id: '',
      cognito_region: 'us-east-1',
      bucket_name: '',
      lambda_api_url: ''
    });
  };

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
    <ConfigSetupView
      configMethod={configMethod}
      config={config}
      jsonInput={jsonInput}
      error={error}
      saving={saving}
      languageToggle={languageToggle}
      onSetConfigMethod={setConfigMethod}
      onConfigChange={(field, value) => setConfig(prev => ({ ...prev, [field]: value }))}
      onJsonInputChange={setJsonInput}
      onJsonImport={handleJsonImport}
      onSaveConfig={handleSaveConfig}
      onResetConfig={handleResetConfig}
    />
  );
}
