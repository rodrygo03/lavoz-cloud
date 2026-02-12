import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import CognitoLoginViewAlt3 from './CognitoLoginViewAlt3';

const defaultArgs = {
  screen: 'login' as const,
  email: '',
  onEmailChange: fn(),
  password: '',
  onPasswordChange: fn(),
  showPassword: false,
  onTogglePassword: fn(),
  newPassword: '',
  onNewPasswordChange: fn(),
  confirmPassword: '',
  onConfirmPasswordChange: fn(),
  phoneNumber: '',
  onPhoneNumberChange: fn(),
  requirePhone: false,
  error: '',
  isLoggingIn: false,
  onLogin: fn(),
  onNewPasswordSubmit: fn(),
  onBack: fn(),
  onForgotPassword: fn(),
  title: '',
  subtitle: 'Sign in to access your backups',
  logoVariant: 'cloud',
  logoSize: 256,
};

const LOGO_BASE_SIZE = 96;

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
          margin: '0 auto',
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
          margin: '0 auto',
        }}
      />
    );
  }

  return undefined;
};

const meta: Meta<any> = {
  title: 'Prototypes/CognitoLogin/CognitoLoginViewAlt3',
  component: CognitoLoginViewAlt3,
  args: defaultArgs as any,
  argTypes: {
    screen: {
      control: 'inline-radio',
      options: ['login', 'newPassword'],
      description: 'Which screen to display',
    },
    error: {
      control: 'text',
      description: 'Error message (empty = hidden)',
    },
    isLoggingIn: {
      control: 'boolean',
      description: 'Show loading spinner on submit button',
    },
    showPassword: {
      control: 'boolean',
      description: 'Toggle password visibility',
    },
    requirePhone: {
      control: 'boolean',
      description: 'Show phone number field on new-password screen',
    },
    title: {
      control: 'text',
      description: 'Login screen heading',
    },
    subtitle: {
      control: 'text',
      description: 'Login screen subheading',
    },
    email: { control: 'text' },
    password: { control: 'text' },
    newPassword: { control: 'text' },
    confirmPassword: { control: 'text' },
    phoneNumber: { control: 'text' },
    logoVariant: {
      control: 'select',
      options: ['default', 'cloud', 'cloud-2', 'none'],
      description: 'Logo element (swap with your own in a prototype)',
    },
    logoSize: {
      control: { type: 'number', min: 48, max: 512, step: 8 },
      description: 'Logo image size (px)',
    },
  } as any,
  parameters: {
    layout: 'fullscreen',
  },
  render: ({ logoVariant, logoSize, ...args }: any) => {
    const logo = resolveLogo(logoVariant, logoSize);
    return <CognitoLoginViewAlt3 {...args} logo={logo} />;
  },
};

export default meta;
type Story = StoryObj<any>;

/** Switch between screens, toggle loading/error from Controls */
export const Playground: Story = {
  args: {
    logoVariant: 'cloud',
    logoSize: 240,
  },
};

/** Login screen with pre-filled email */
export const LoginFilled: Story = {
  args: {
    screen: 'login',
    email: 'jane.doe@acme.com',
    password: 'password123',
  },
};

/** Login screen in loading state */
export const LoginLoading: Story = {
  args: {
    screen: 'login',
    email: 'jane.doe@acme.com',
    isLoggingIn: true,
  },
};

/** Login screen with error */
export const LoginError: Story = {
  args: {
    screen: 'login',
    email: 'wrong@acme.com',
    error: 'Invalid email or password. Please try again.',
  },
};

/** New password screen */
export const NewPasswordScreen: Story = {
  args: {
    screen: 'newPassword',
    requirePhone: false,
  },
};

/** New password screen with phone required */
export const NewPasswordWithPhone: Story = {
  args: {
    screen: 'newPassword',
    requirePhone: true,
  },
};

/** New password screen with validation error */
export const NewPasswordError: Story = {
  args: {
    screen: 'newPassword',
    newPassword: 'short',
    error: 'Password must be at least 8 characters',
  },
};

/** Both screens side-by-side for visual comparison */
export const AllScreens: Story = {
  render: (args: any) => {
    const { logoVariant, logoSize, ...rest } = args;
    const logo = resolveLogo(logoVariant, logoSize);
    return (
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.2)' }}>
          <CognitoLoginViewAlt3 {...rest} logo={logo} screen="login" email="jane@acme.com" />
        </div>
        <div style={{ flex: 1 }}>
          <CognitoLoginViewAlt3 {...rest} logo={logo} screen="newPassword" requirePhone={true} />
        </div>
      </div>
    );
  },
};
