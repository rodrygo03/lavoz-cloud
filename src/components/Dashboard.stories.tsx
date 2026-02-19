import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import Dashboard from './Dashboard';
import {
  mockUserProfile,
  mockCompletedBackup,
  mockFailedBackup,
  mockDailySchedule,
} from '../__mocks__/mockData';

const meta = {
  title: 'Components/Dashboard',
  component: Dashboard,
  args: {
    onProfileUpdated: fn(),
  },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Dashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No profile selected */
export const NoProfile: Story = {
  args: {
    profile: null,
  },
};

/** Profile selected but no backups yet */
export const WithProfile: Story = {
  args: {
    profile: mockUserProfile,
  },
};

/** Profile with a completed last backup (rendered via mock invoke) */
export const WithLastBackup: Story = {
  args: {
    profile: mockUserProfile,
  },
};

/** Sync-mode profile (shows "Preview Changes" button) */
export const SyncMode: Story = {
  args: {
    profile: { ...mockUserProfile, mode: 'Sync' as const },
  },
};
