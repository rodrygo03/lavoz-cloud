import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FileText } from 'lucide-react';
import { Card, CardHeader, CardContent } from './Card';
import { IconButton } from './Button';

const meta = {
  title: 'Primitives/Card',
  component: Card,
  argTypes: {
    fullWidth: {
      control: 'boolean',
      description: 'Span full grid width',
    },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tweak title, content, and fullWidth live */
export const Playground: Story = {
  argTypes: {
    title: { control: 'text', description: 'Card header title' },
    body: { control: 'text', description: 'Card body text' },
    showAction: { control: 'boolean', description: 'Show header action icon' },
  },
  args: {
    fullWidth: false,
    title: 'Backup Actions',
    body: 'Card content goes here. Edit this text in the controls panel.',
    showAction: false,
  } as any,
  render: ({ fullWidth, title, body, showAction }: any) => (
    <Card fullWidth={fullWidth}>
      <CardHeader
        title={title}
        action={showAction ? <IconButton><FileText size={16} /></IconButton> : undefined}
      />
      <CardContent>
        <p>{body}</p>
      </CardContent>
    </Card>
  ),
};

/** Card with an action button in the header */
export const WithAction: Story = {
  args: { fullWidth: false },
  render: ({ fullWidth }) => (
    <Card fullWidth={fullWidth}>
      <CardHeader
        title="Recent Logs"
        action={<IconButton onClick={fn()}><FileText size={16} /></IconButton>}
      />
      <CardContent>
        <pre style={{ margin: 0 }}>2024-01-01 Backup completed successfully</pre>
      </CardContent>
    </Card>
  ),
};

/** Full-width card */
export const FullWidth: Story = {
  args: { fullWidth: true },
  render: ({ fullWidth }) => (
    <Card fullWidth={fullWidth}>
      <CardHeader title="Full Width Card" />
      <CardContent>
        <p>This card spans the full width of the grid.</p>
      </CardContent>
    </Card>
  ),
};
