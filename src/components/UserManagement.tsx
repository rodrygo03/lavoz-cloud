import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { 
  Users, 
  Key, 
  Copy, 
  Download,
  RefreshCw
} from 'lucide-react';
import { Profile, Employee } from '../types';

interface UserManagementProps {
  profile: Profile | null;
}

export default function UserManagement({ profile }: UserManagementProps) {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [rcloneConfig, setRcloneConfig] = useState<string>('');
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (profile?.aws_config?.employees) {
      setEmployees(profile.aws_config.employees);
    }
  }, [profile]);

  const generateRcloneConfig = async (employee: Employee) => {
    if (!profile?.aws_config) return;

    try {
      // Try backend function first
      const config = await invoke<string>('generate_employee_rclone_config', {
        employee,
        bucketName: profile.aws_config.bucket_name,
        region: profile.aws_config.aws_region
      });
      setRcloneConfig(config);
      setSelectedEmployee(employee);
    } catch (error) {
      console.error('Backend generation failed, using client-side generation:', error);
      
      // Fallback: Generate config client-side
      const config = `[aws]
type = s3
provider = AWS
env_auth = false
access_key_id = ${employee.access_key_id}
secret_access_key = ${employee.secret_access_key}
region = ${profile.aws_config.aws_region}
acl = private`;
      
      setRcloneConfig(config);
      setSelectedEmployee(employee);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copied to clipboard!`);
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  const toggleCredentials = (employeeId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  };

  const downloadRcloneConfig = async () => {
    console.log('Download requested:', { hasConfig: !!rcloneConfig, hasEmployee: !!selectedEmployee });
    
    if (!rcloneConfig || !selectedEmployee) {
      console.error('Cannot download: missing config or employee');
      alert(t('userManagement.configNotGenerated') || 'Please generate the config first');
      return;
    }

    try {
      console.log('Using Tauri save dialog for config:', rcloneConfig.substring(0, 50) + '...');
      
      const filename = `rclone-${selectedEmployee.username}.conf`;
      
      // Use Tauri's save dialog
      const filePath = await save({
        defaultPath: filename,
        filters: [{
          name: 'Config Files',
          extensions: ['conf']
        }]
      });

      if (filePath) {
        // Write the file using Tauri's writeFile
        await invoke('write_text_file', {
          path: filePath,
          contents: rcloneConfig
        });
        
        console.log('File saved successfully to:', filePath);
        alert(t('userManagement.downloadSuccess', { filename: filePath }) || `✅ Config saved successfully!\n\nLocation: ${filePath}`);
      } else {
        console.log('User cancelled save dialog');
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      
      // Fallback to browser download if Tauri method fails
      console.log('Falling back to browser download...');
      try {
        const blob = new Blob([rcloneConfig], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rclone-${selectedEmployee.username}.conf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        alert(t('userManagement.downloadSuccess', { filename: `rclone-${selectedEmployee.username}.conf` }) || '✅ Config downloaded to Downloads folder');
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
        alert(t('userManagement.downloadFailed') || 'Download failed: ' + error);
      }
    }
  };

  if (!profile || profile.profile_type !== 'Admin') {
    return (
      <div className="user-management">
        <div className="empty-state">
          <Users size={48} />
          <h2>{t('userManagement.adminAccessRequired')}</h2>
          <p>{t('userManagement.adminAccessRequiredDesc')}</p>
        </div>
      </div>
    );
  }

  if (!profile.aws_config) {
    return (
      <div className="user-management">
        <div className="empty-state">
          <Users size={48} />
          <h2>{t('userManagement.noAwsConfiguration')}</h2>
          <p>{t('userManagement.noAwsConfigurationDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <h1>{t('userManagement.title')}</h1>
        <p>{t('userManagement.manageEmployeeAccounts')}</p>
      </div>

      <div className="management-content">
        <div className="employees-section">
          <div className="section-header">
            <h2>{t('userManagement.employees')} ({employees.length})</h2>
            <button className="btn-icon" title={t('common.refresh')}>
              <RefreshCw size={16} />
            </button>
          </div>

          {employees.length === 0 ? (
            <div className="empty-state-small">
              <Users size={24} />
              <p>{t('userManagement.noEmployeesConfigured')}</p>
            </div>
          ) : (
            <div className="employees-list">
              {employees.map((employee) => (
                <div key={employee.id} className="employee-card">
                  <div className="employee-info">
                    <div className="employee-name">{employee.name}</div>
                    <div className="employee-username">@{employee.username}</div>
                    <div className="employee-created">
                      {t('userManagement.createdAt')}: {new Date(employee.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="employee-actions">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => toggleCredentials(employee.id)}
                    >
                      <Key size={14} />
                      {showCredentials[employee.id] ? t('userManagement.hideCredentials') : t('userManagement.showCredentials')}
                    </button>

                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => generateRcloneConfig(employee)}
                    >
                      {t('userManagement.generateConfig')}
                    </button>
                  </div>

                  {showCredentials[employee.id] && (
                    <div className="credentials-section">
                      <h4>{t('userManagement.awsCredentials')}</h4>
                      
                      <div className="credential-item">
                        <label>{t('userManagement.accessKey')} ID</label>
                        <div className="credential-value">
                          <code>{employee.access_key_id}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(employee.access_key_id, t('userManagement.accessKey') + ' ID')}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="credential-item">
                        <label>{t('userManagement.secretKey')}</label>
                        <div className="credential-value">
                          <code>{employee.secret_access_key}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(employee.secret_access_key, t('userManagement.secretKey'))}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="credential-item">
                        <label>{t('userManagement.region')}</label>
                        <div className="credential-value">
                          <code>{profile.aws_config?.aws_region}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(profile.aws_config!.aws_region, t('userManagement.region'))}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="credential-item">
                        <label>{t('userManagement.bucketName')}</label>
                        <div className="credential-value">
                          <code>{profile.aws_config?.bucket_name}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(profile.aws_config!.bucket_name, t('userManagement.bucketName'))}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="credential-item">
                        <label>{t('userManagement.usernameForSetup')}</label>
                        <div className="credential-value">
                          <code>{employee.username}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(employee.username, t('userManagement.username'))}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="share-instructions">
                        <h5>{t('userManagement.instructionsFor', { name: employee.name })}:</h5>
                        <ol>
                          <li>{t('userManagement.instruction1')}</li>
                          <li>{t('userManagement.instruction2')}</li>
                          <li>{t('userManagement.instruction3')}</li>
                          <li>{t('userManagement.instruction4')}</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedEmployee && rcloneConfig && (
          <div className="config-preview">
            <div className="section-header">
              <h3>{t('userManagement.rcloneConfigFor', { name: selectedEmployee.name })}</h3>
              <button
                className="btn btn-primary"
                onClick={downloadRcloneConfig}
              >
                <Download size={16} />
                {t('userManagement.downloadConfig')}
              </button>
            </div>

            <div className="config-content">
              <pre>{rcloneConfig}</pre>
            </div>

            <div className="config-instructions">
              <h4>{t('userManagement.setupInstructions')}:</h4>
              <ol>
                <li>{t('userManagement.setupStep1')}</li>
                <li>{t('userManagement.setupStep2')}</li>
                <li>{t('userManagement.setupStep3')}</li>
                <li>{t('userManagement.setupStep4', { username: selectedEmployee.username })}</li>
                <li>{t('userManagement.setupStep5', { bucket: profile.aws_config.bucket_name })}</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}