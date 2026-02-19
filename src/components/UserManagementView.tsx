import {
  Users,
  Key,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';
import { Profile, Employee } from '../types';

export interface UserManagementViewProps {
  profile: Profile | null;
  employees: Employee[];
  selectedEmployee: Employee | null;
  rcloneConfig: string;
  showCredentials: Record<string, boolean>;

  // Actions
  onGenerateRcloneConfig: (employee: Employee) => void;
  onCopyToClipboard: (text: string, label: string) => void;
  onToggleCredentials: (employeeId: string) => void;
  onDownloadRcloneConfig: () => void;

  // i18n
  t: (key: string, options?: any) => string;
}

export default function UserManagementView({
  profile,
  employees,
  selectedEmployee,
  rcloneConfig,
  showCredentials,
  onGenerateRcloneConfig,
  onCopyToClipboard,
  onToggleCredentials,
  onDownloadRcloneConfig,
  t,
}: UserManagementViewProps) {
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
                      onClick={() => onToggleCredentials(employee.id)}
                    >
                      <Key size={14} />
                      {showCredentials[employee.id] ? t('userManagement.hideCredentials') : t('userManagement.showCredentials')}
                    </button>

                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => onGenerateRcloneConfig(employee)}
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
                            onClick={() => onCopyToClipboard(employee.access_key_id, t('userManagement.accessKey') + ' ID')}
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
                            onClick={() => onCopyToClipboard(employee.secret_access_key, t('userManagement.secretKey'))}
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
                            onClick={() => onCopyToClipboard(profile.aws_config!.aws_region, t('userManagement.region'))}
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
                            onClick={() => onCopyToClipboard(profile.aws_config!.bucket_name, t('userManagement.bucketName'))}
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
                            onClick={() => onCopyToClipboard(employee.username, t('userManagement.username'))}
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
                onClick={onDownloadRcloneConfig}
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
