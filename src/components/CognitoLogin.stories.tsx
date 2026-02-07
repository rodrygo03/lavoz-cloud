import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import CognitoLogin from './CognitoLogin';

const meta = {
  title: 'Components/CognitoLogin',
  component: CognitoLogin,
  args: {
    onLoginSuccess: fn(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CognitoLogin>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default login form */
export const Default: Story = {};
