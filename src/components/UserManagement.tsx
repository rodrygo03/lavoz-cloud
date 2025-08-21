import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
      const config = await invoke<string>('generate_employee_rclone_config', {
        employee,
        bucketName: profile.aws_config.bucket_name,
        region: profile.aws_config.aws_region
      });
      setRcloneConfig(config);
      setSelectedEmployee(employee);
    } catch (error) {
      console.error('Failed to generate rclone config:', error);
      alert('Failed to generate rclone config: ' + error);
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

  const downloadRcloneConfig = () => {
    if (!rcloneConfig || !selectedEmployee) return;

    const blob = new Blob([rcloneConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rclone-${selectedEmployee.username}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!profile || profile.profile_type !== 'Admin') {
    return (
      <div className="user-management">
        <div className="empty-state">
          <Users size={48} />
          <h2>Admin Access Required</h2>
          <p>This section is only available to administrator profiles.</p>
        </div>
      </div>
    );
  }

  if (!profile.aws_config) {
    return (
      <div className="user-management">
        <div className="empty-state">
          <Users size={48} />
          <h2>No AWS Configuration</h2>
          <p>Complete the admin setup to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <h1>User Management</h1>
        <p>Manage employee access credentials and configurations</p>
      </div>

      <div className="management-content">
        <div className="employees-section">
          <div className="section-header">
            <h2>Employees ({employees.length})</h2>
            <button className="btn-icon" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>

          {employees.length === 0 ? (
            <div className="empty-state-small">
              <Users size={24} />
              <p>No employees configured</p>
            </div>
          ) : (
            <div className="employees-list">
              {employees.map((employee) => (
                <div key={employee.id} className="employee-card">
                  <div className="employee-info">
                    <div className="employee-name">{employee.name}</div>
                    <div className="employee-username">@{employee.username}</div>
                    <div className="employee-created">
                      Created: {new Date(employee.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="employee-actions">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => toggleCredentials(employee.id)}
                    >
                      <Key size={14} />
                      {showCredentials[employee.id] ? 'Hide' : 'Show'} Credentials
                    </button>

                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => generateRcloneConfig(employee)}
                    >
                      Generate Config
                    </button>
                  </div>

                  {showCredentials[employee.id] && (
                    <div className="credentials-section">
                      <h4>AWS Credentials</h4>
                      
                      <div className="credential-item">
                        <label>Access Key ID</label>
                        <div className="credential-value">
                          <code>{employee.access_key_id}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(employee.access_key_id, 'Access Key ID')}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="credential-item">
                        <label>Secret Access Key</label>
                        <div className="credential-value">
                          <code>{employee.secret_access_key}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(employee.secret_access_key, 'Secret Access Key')}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="credential-item">
                        <label>Region</label>
                        <div className="credential-value">
                          <code>{profile.aws_config?.aws_region}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(profile.aws_config!.aws_region, 'Region')}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="credential-item">
                        <label>Bucket Name</label>
                        <div className="credential-value">
                          <code>{profile.aws_config?.bucket_name}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(profile.aws_config!.bucket_name, 'Bucket Name')}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="credential-item">
                        <label>Username (for app setup)</label>
                        <div className="credential-value">
                          <code>{employee.username}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(employee.username, 'Username')}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="share-instructions">
                        <h5>Instructions for {employee.name}:</h5>
                        <ol>
                          <li>Download and install the Cloud Backup app</li>
                          <li>Choose "User Setup" when first opening the app</li>
                          <li>Enter the credentials above when prompted</li>
                          <li>Configure their source folders and start backing up</li>
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
              <h3>Rclone Configuration for {selectedEmployee.name}</h3>
              <button
                className="btn btn-primary"
                onClick={downloadRcloneConfig}
              >
                <Download size={16} />
                Download Config
              </button>
            </div>

            <div className="config-content">
              <pre>{rcloneConfig}</pre>
            </div>

            <div className="config-instructions">
              <h4>Setup Instructions:</h4>
              <ol>
                <li>Download the config file above</li>
                <li>Save it as <code>rclone.conf</code> in a secure location</li>
                <li>Use this config file path in the Cloud Backup app setup</li>
                <li>Set the username to: <code>{selectedEmployee.username}</code></li>
                <li>Set the bucket to: <code>{profile.aws_config.bucket_name}</code></li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}