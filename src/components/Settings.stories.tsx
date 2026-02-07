import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import Settings from './Settings';
import { mockUserProfile, mockAdminProfile } from '../__mocks__/mockData';

const meta = {
  title: 'Components/Settings',
  component: Settings,
  args: {
    onProfileUpdated: fn(),
  },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Settings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No profile selected */
export const NoProfile: Story = {
  args: {
    profile: null,
  },
};

/** General tab (default) */
export const GeneralTab: Story = {
  args: {
    profile: mockUserProfile,
  },
};

/** Admin profile settings */
export const AdminSettings: Story = {
  args: {
    profile: mockAdminProfile,
  },
};
