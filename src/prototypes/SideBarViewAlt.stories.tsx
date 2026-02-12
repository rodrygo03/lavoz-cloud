import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Monitor, Cloud, Settings, Users } from 'lucide-react';
import SideBarViewAlt from './SideBarViewAlt';
import {
  mockAdminProfile,
  mockUserProfile,
  mockAdminSession,
  mockUserSession,
} from '../__mocks__/mockData';

const t = (key: string) => {
  const translations: Record<string, string> = {
    'sidebar.dashboard': 'Dashboard',
    'sidebar.cloudBrowser': 'Cloud Browser',
    'sidebar.settings': 'Settings',
    'sidebar.userManagement': 'User Management',
    'sidebar.newProfile': 'New profile',
    'sidebar.noProfiles': 'No profiles yet',
    'sidebar.createProfile': 'Create profile',
  };

  return translations[key] ?? key;
};

const LOGO_BASE_SIZE = 24;

const resolveLogo = (logoVariant: string, logoSize: number) => {
  const scale = logoSize / LOGO_BASE_SIZE;

  if (logoVariant === 'none') {
    return null;
  }

  if (logoVariant === 'cloud') {
    return (
      <img
        src="/cloud.png"
        alt="Cloud logo"
        style={{
          width: LOGO_BASE_SIZE,
          height: LOGO_BASE_SIZE,
          objectFit: 'contain',
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          display: 'block',
        }}
      />
    );
  }

  if (logoVariant === 'cloud-2') {
    return (
      <img
        src="/cloud-2.png"
        alt="Cloud logo 2"
        style={{
          width: LOGO_BASE_SIZE,
          height: LOGO_BASE_SIZE,
          objectFit: 'contain',
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          display: 'block',
        }}
      />
    );
  }

  return null;
};

const defaultArgs = {
  profiles: [mockAdminProfile, mockUserProfile],
  activeProfile: mockAdminProfile,
  userSession: mockAdminSession,
  navItems: [
    { path: '/dashboard', label: t('sidebar.dashboard'), icon: Monitor },
    { path: '/cloud-browser', label: t('sidebar.cloudBrowser'), icon: Cloud },
    { path: '/settings', label: t('sidebar.settings'), icon: Settings },
    { path: '/user-management', label: t('sidebar.userManagement'), icon: Users },
  ],
  currentPath: '/dashboard',
  showProfileMenu: 'none',
  onProfileSelect: fn(),
  onNewProfile: fn(),
  onDeleteProfile: fn(),
  onToggleProfileMenu: fn(),
  onLogout: fn(),
  t,
  logoVariant: 'cloud-2',
  logoSize: 64,
};

const meta: Meta<any> = {
  title: 'Prototypes/Sidebar/SideBarViewAlt',
  component: SideBarViewAlt,
  args: defaultArgs as any,
  argTypes: {
    currentPath: {
      control: 'inline-radio',
      options: ['/dashboard', '/cloud-browser', '/settings', '/user-management'],
      description: 'Active nav route',
    },
    showProfileMenu: {
      control: 'select',
      options: ['none', 'profile-admin-1', 'profile-user-1'],
      description: 'Open profile menu for a profile id',
    },
    logoVariant: {
      control: 'select',
      options: ['cloud', 'cloud-2', 'none'],
      description: 'Sidebar logo element',
    },
    logoSize: {
      control: { type: 'number', min: 16, max: 64, step: 4 },
      description: 'Logo image size (px)',
    },
  } as any,
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
  render: ({ logoVariant, logoSize, showProfileMenu, ...args }: any) => {
    const logo = resolveLogo(logoVariant, logoSize);
    const resolvedMenu = showProfileMenu === 'none' ? null : showProfileMenu;
    return <SideBarViewAlt {...args} showProfileMenu={resolvedMenu} logo={logo} />;
  },
};

export default meta;
type Story = StoryObj<any>;

/** Interactive playground */
export const Playground: Story = {
  args: {
    activeProfile: mockAdminProfile,
    userSession: mockAdminSession,
    logoVariant: "cloud-2",
    logoSize: 64
  },
};

/** User profile with session */
export const UserProfile: Story = {
  args: {
    profiles: [mockUserProfile],
    activeProfile: mockUserProfile,
    userSession: mockUserSession,
    currentPath: '/cloud-browser',
  },
};

/** Empty profile list */
export const NoProfiles: Story = {
  args: {
    profiles: [],
    activeProfile: null,
    currentPath: '/settings',
  },
};
