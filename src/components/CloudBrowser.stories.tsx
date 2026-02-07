import type { Meta, StoryObj } from '@storybook/react-vite';
import CloudBrowser from './CloudBrowser';
import { mockUserProfile, mockAdminProfile } from '../__mocks__/mockData';

const meta = {
  title: 'Components/CloudBrowser',
  component: CloudBrowser,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CloudBrowser>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No profile selected */
export const NoProfile: Story = {
  args: {
    profile: null,
  },
};

/** Regular user browsing cloud files (empty by default via mock) */
export const EmptyFolder: Story = {
  args: {
    profile: mockUserProfile,
  },
};

/** Admin user browsing (shows admin badge) */
export const AdminView: Story = {
  args: {
    profile: mockAdminProfile,
  },
};
