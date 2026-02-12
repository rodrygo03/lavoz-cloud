import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { AlertBox } from './AlertBox';

const iconMap = {
  AlertCircle: <AlertCircle size={16} />,
  AlertTriangle: <AlertTriangle size={16} />,
  CheckCircle: <CheckCircle size={16} />,
  Info: <Info size={16} />,
  none: undefined,
};

const meta = {
  title: 'Primitives/AlertBox',
  component: AlertBox,
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['info', 'warning', 'success', 'error'],
      description: 'Alert style variant',
    },
    icon: {
      control: 'select',
      options: Object.keys(iconMap),
      mapping: iconMap,
      description: 'Leading icon',
    },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AlertBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tweak variant, icon, and message text live */
export const Playground: Story = {
  argTypes: {
    message: { control: 'text', description: 'Alert body text' },
  },
  args: {
    variant: 'info',
    icon: 'AlertCircle' as any,
    message: 'First time signing in? Use the email and temporary password provided by your administrator.',
  } as any,
  render: ({ message, ...rest }: any) => (
    <AlertBox {...rest}>
      <div><p style={{ margin: 0 }}>{message}</p></div>
    </AlertBox>
  ),
};

/** All four variants at a glance */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <AlertBox variant="info" icon={<AlertCircle size={16} />}>
        <div><p style={{ margin: 0 }}>This is an <strong>info</strong> alert.</p></div>
      </AlertBox>
      <AlertBox variant="warning" icon={<AlertTriangle size={16} />}>
        <div><strong>Warning:</strong> This operation will delete files.</div>
      </AlertBox>
      <AlertBox variant="success" icon={<CheckCircle size={16} />}>
        <span>Backup completed successfully!</span>
      </AlertBox>
      <AlertBox variant="error" icon={<AlertCircle size={16} />}>
        <span>Invalid email or password. Please try again.</span>
      </AlertBox>
    </div>
  ),
};
