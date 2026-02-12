import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Profile, Employee } from '../types';
import UserManagementView from './UserManagementView';

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

  return (
    <UserManagementView
      profile={profile}
      employees={employees}
      selectedEmployee={selectedEmployee}
      rcloneConfig={rcloneConfig}
      showCredentials={showCredentials}
      onGenerateRcloneConfig={generateRcloneConfig}
      onCopyToClipboard={copyToClipboard}
      onToggleCredentials={toggleCredentials}
      onDownloadRcloneConfig={downloadRcloneConfig}
      t={t}
    />
  );
}
