import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import Sidebar from './Sidebar';
import {
  mockAdminProfile,
  mockUserProfile,
  mockAdminSession,
  mockUserSession,
} from '../__mocks__/mockData';

const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  args: {
    onProfileSelect: fn(),
    onNewProfile: fn(),
    onProfilesUpdated: fn(),
    onLogout: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280, height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Admin user with multiple profiles */
export const AdminWithProfiles: Story = {
  args: {
    profiles: [mockAdminProfile, mockUserProfile],
    activeProfile: mockAdminProfile,
    userSession: mockAdminSession,
  },
};

/** Regular user with one profile */
export const UserWithProfile: Story = {
  args: {
    profiles: [mockUserProfile],
    activeProfile: mockUserProfile,
    userSession: mockUserSession,
  },
};

/** Empty state — no profiles created yet */
export const NoProfiles: Story = {
  args: {
    profiles: [],
    activeProfile: null,
    userSession: mockUserSession,
  },
};

/** No active session (before login) */
export const NoSession: Story = {
  args: {
    profiles: [],
    activeProfile: null,
    userSession: null,
  },
};
