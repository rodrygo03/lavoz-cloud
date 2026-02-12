import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import SettingsViewAlt from './SettingsViewAlt';
import { mockUserProfile, mockAdminProfile, mockDailySchedule } from '../__mocks__/mockData';

const t = (key: string, options?: any) => {
  const translations: Record<string, string> = {
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.sources': 'Sources',
    'settings.advanced': 'Advanced',
    'settings.schedule': 'Schedule',
    'settings.profileName': 'Profile Name',
    'settings.rcloneBinary': 'Rclone Binary',
    'settings.rcloneConfig': 'Rclone Config',
    'settings.remote': 'Remote',
    'settings.bucket': 'Bucket',
    'settings.prefix': 'Prefix',
    'settings.backupMode': 'Backup Mode',
    'settings.copyMode': 'Copy',
    'settings.copyModeDescription': 'Copies new and changed files without deleting anything at the destination',
    'settings.syncMode': 'Sync',
    'settings.syncModeDescription': 'Makes the destination identical to the source, deleting extra files',
    'settings.foldersToBackup': 'Folders to Backup',
    'settings.pathToFolder': '/path/to/folder',
    'settings.addFolder': 'Add Folder',
    'settings.backupSchedule': 'Backup Schedule',
    'settings.configureAutomaticBackup': 'Configure when automatic backups should run.',
    'settings.enableAutomaticBackups': 'Enable automatic backups',
    'settings.frequency': 'Frequency',
    'settings.daily': 'Daily',
    'settings.weekly': 'Weekly',
    'settings.monthly': 'Monthly',
    'settings.time': 'Time',
    'settings.timeFormat': '24-hour format (HH:MM)',
    'settings.saveSchedule': 'Save Schedule',
    'settings.saving': 'Saving...',
    'settings.saveChanges': 'Save Changes',
    'settings.scheduleUpdatedSuccessfully': 'Schedule updated successfully!',
    'settings.autoSetup': 'Auto-Setup',
    'settings.noProfileSelected': 'No Profile Selected',
    'settings.selectProfileSettings': 'Select a profile from the sidebar to view settings.',
  };
  return translations[key] || options?.defaultValue || key;
};

const defaultArgs = {
  profile: mockUserProfile,
  editedProfile: { ...mockUserProfile },
  schedule: mockDailySchedule,
  activeTab: 'general' as const,
  saving: false,
  hasChanges: false,
  showScheduleNotification: false,
  onSetActiveTab: fn(),
  onProfileChange: fn(),
  onSourceChange: fn(),
  onAddSource: fn(),
  onRemoveSource: fn(),
  onSaveProfile: fn(),
  onSaveSchedule: fn(),
  onScheduleChange: fn(),
  onOpenFolderDialog: fn(),
  t,
};

const meta: Meta<typeof SettingsViewAlt> = {
  title: 'Prototypes/Settings/SettingsViewAlt',
  component: SettingsViewAlt,
  args: defaultArgs,
  argTypes: {
    activeTab: {
      control: 'inline-radio',
      options: ['general', 'sources', 'schedule'],
      description: 'Active settings tab',
    },
    saving: {
      control: 'boolean',
      description: 'Show saving state on save button',
    },
    hasChanges: {
      control: 'boolean',
      description: 'Show unsaved changes footer',
    },
    showScheduleNotification: {
      control: 'boolean',
      description: 'Show schedule saved notification',
    },
  },
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Playground — tweak controls to explore states */
export const Playground: Story = {
  args: {
    activeTab: 'general',
  },
};

/** General tab — simplified (no rclone/profile fields) */
export const GeneralTab: Story = {
  args: {
    activeTab: 'general',
  },
};

/** Sources tab */
export const SourcesTab: Story = {
  args: {
    activeTab: 'sources',
  },
};

/** Schedule tab */
export const ScheduleTab: Story = {
  args: {
    activeTab: 'schedule',
  },
};

/** With unsaved changes banner */
export const UnsavedChanges: Story = {
  args: {
    activeTab: 'general',
    hasChanges: true,
  },
};

/** Saving state */
export const Saving: Story = {
  args: {
    activeTab: 'general',
    hasChanges: true,
    saving: true,
  },
};

/** Schedule saved notification */
export const ScheduleNotification: Story = {
  args: {
    activeTab: 'schedule',
    showScheduleNotification: true,
  },
};

/** No profile selected */
export const NoProfile: Story = {
  args: {
    profile: null,
    editedProfile: null,
  },
};

/** Admin profile */
export const AdminProfile: Story = {
  args: {
    profile: mockAdminProfile,
    editedProfile: { ...mockAdminProfile },
  },
};
