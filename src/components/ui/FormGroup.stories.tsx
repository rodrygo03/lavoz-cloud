import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormGroup, FormRow } from './FormGroup';

const meta = {
  title: 'Primitives/FormGroup',
  component: FormGroup,
  argTypes: {
    label: { control: 'text', description: 'Field label' },
    htmlFor: { control: 'text', description: 'Matching input id' },
    error: { control: 'text', description: 'Error message (red)' },
    helpText: { control: 'text', description: 'Help text below input' },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FormGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tweak label, error, and helpText live */
export const Playground: Story = {
  args: {
    label: 'Profile Name',
    htmlFor: 'profile-name',
    error: '',
    helpText: '',
    children: <input id="profile-name" type="text" placeholder="My Backup" />,
  },
};

/** Toggle the error message on/off */
export const WithError: Story = {
  args: {
    label: 'Email',
    htmlFor: 'email',
    error: 'Email is required',
    children: <input id="email" type="email" />,
  },
};

/** Toggle help text on/off */
export const WithHelpText: Story = {
  args: {
    label: 'Phone Number',
    htmlFor: 'phone',
    helpText: 'Include country code (e.g., +1 for US)',
    children: <input id="phone" type="tel" placeholder="+1234567890" />,
  },
};

/** Both error and help text together */
export const ErrorAndHelp: Story = {
  args: {
    label: 'Password',
    htmlFor: 'password',
    error: 'Password must be at least 8 characters',
    helpText: 'Use a mix of letters, numbers, and symbols',
    children: <input id="password" type="password" />,
  },
};

/** Multiple form groups in a responsive row */
export const InFormRow: Story = {
  render: () => (
    <FormRow>
      <FormGroup label="Remote" htmlFor="remote">
        <input id="remote" type="text" value="s3" readOnly />
      </FormGroup>
      <FormGroup label="Bucket" htmlFor="bucket">
        <input id="bucket" type="text" value="my-bucket" readOnly />
      </FormGroup>
      <FormGroup label="Prefix" htmlFor="prefix">
        <input id="prefix" type="text" value="user1" readOnly />
      </FormGroup>
    </FormRow>
  ),
};
