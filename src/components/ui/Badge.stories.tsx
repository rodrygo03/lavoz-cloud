import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  argTypes: {
    children: { control: 'text', description: 'Badge label' },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Edit the badge text live */
export const Playground: Story = {
  args: { children: '(Admin View - All Users)' },
};

/** Multiple badges side-by-side */
export const Examples: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Badge>(Admin)</Badge>
      <Badge>(Read Only)</Badge>
      <Badge>(Owner)</Badge>
    </div>
  ),
};
