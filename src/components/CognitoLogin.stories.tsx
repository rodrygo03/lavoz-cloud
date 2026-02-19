import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import CognitoLoginView from './CognitoLoginView';

// const noop = fn();

const defaultArgs = {
  screen: 'login' as const,
  email: '',
  onEmailChange: fn(),
  password: '',
  onPasswordChange: fn(),
  showPassword: false,
  onTogglePassword: fn(),
  // mfaCode: '',
  // onMfaCodeChange: fn(),
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
  // onMfaSubmit: fn(),
  onNewPasswordSubmit: fn(),
  onBack: fn(),
  onForgotPassword: fn(),
  title: 'Cloud Backup',
  subtitle: 'Sign in to access your backups',
};

const meta = {
  title: 'Components/CognitoLoginView',
  component: CognitoLoginView,
  args: defaultArgs,
  argTypes: {
    screen: {
      control: 'inline-radio',
      options: ['login', /* 'mfa', */ 'newPassword'],
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
    // mfaCode: { control: 'text' },
    newPassword: { control: 'text' },
    confirmPassword: { control: 'text' },
    phoneNumber: { control: 'text' },
    logo: {
      control: 'select',
      options: ['default', 'cloud', 'cloud-2', 'none'],
      mapping: {
        default: undefined,
        cloud: <img src={`${import.meta.env.BASE_URL}cloud.png`} alt="Cloud logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />,
        'cloud-2': <img src={`${import.meta.env.BASE_URL}cloud-2.png`} alt="Cloud logo 2" style={{ width: 64, height: 64, objectFit: 'contain' }} />,
        none: null,
      },
      description: 'Logo element (swap with your own in a prototype)',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CognitoLoginView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Switch between screens, toggle loading/error from Controls */
export const Playground: Story = {
  args: {
    logo: "none"
  }
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

// /** MFA screen */
// export const MfaScreen: Story = {
//   args: {
//     screen: 'mfa',
//     mfaCode: '123456',
//   },
// };
//
// /** MFA screen with error */
// export const MfaError: Story = {
//   args: {
//     screen: 'mfa',
//     mfaCode: '000000',
//     error: 'Invalid MFA code. Please try again.',
//   },
// };

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

/** Custom branding — change title and subtitle */
export const CustomBranding: Story = {
  args: {
    screen: 'login',
    title: 'La Voz Backups',
    subtitle: 'Secure cloud storage for your team',
  },
};

/** All three screens side-by-side for visual comparison */
export const AllScreens: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 0 }}>
      <div style={{ flex: 1, borderRight: '1px solid #e0e0e0' }}>
        <CognitoLoginView {...args} screen="login" email="jane@acme.com" />
      </div>
      {/* <div style={{ flex: 1, borderRight: '1px solid #e0e0e0' }}>
        <CognitoLoginView {...args} screen="mfa" mfaCode="123456" />
      </div> */}
      <div style={{ flex: 1 }}>
        <CognitoLoginView {...args} screen="newPassword" requirePhone={true} />
      </div>
    </div>
  ),
};
