import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

const iconMap = {
  CheckCircle: <CheckCircle size={20} />,
  AlertTriangle: <AlertTriangle size={20} />,
  Clock: <Clock size={20} />,
  Loader2: <Loader2 size={20} className="spinning" />,
  none: undefined,
};

const meta = {
  title: 'Primitives/StatusBadge',
  component: StatusBadge,
  argTypes: {
    status: {
      control: 'inline-radio',
      options: ['completed', 'failed', 'running'],
      description: 'Badge colour variant',
    },
    icon: {
      control: 'select',
      options: Object.keys(iconMap),
      mapping: iconMap,
      description: 'Leading icon',
    },
    children: { control: 'text', description: 'Label text' },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Switch status, icon and label from the controls panel */
export const Playground: Story = {
  args: {
    status: 'completed',
    icon: 'CheckCircle' as any,
    children: 'Completed',
  },
};

/** All statuses at a glance */
export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <StatusBadge status="completed" icon={<CheckCircle size={20} />}>Completed</StatusBadge>
      <StatusBadge status="failed" icon={<AlertTriangle size={20} />}>Failed</StatusBadge>
      <StatusBadge status="running" icon={<Clock size={20} />}>Running</StatusBadge>
    </div>
  ),
};
