import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Play, Trash2, Plus, Download, Save, LogIn, Eye } from 'lucide-react';
import { Button, IconButton } from './Button';

const iconMap = {
  none: null,
  Play: <Play size={16} />,
  Save: <Save size={16} />,
  Download: <Download size={16} />,
  Trash: <Trash2 size={16} />,
  Plus: <Plus size={16} />,
  LogIn: <LogIn size={16} />,
  Eye: <Eye size={16} />,
};

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: {
    onClick: fn(),
    children: 'Click me',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'danger'],
      description: 'Visual style',
    },
    size: {
      control: 'inline-radio',
      options: ['default', 'large', 'small'],
      description: 'Button size',
    },
    disabled: { control: 'boolean' },
    children: { control: 'text', description: 'Button label text' },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tweak every prop live */
export const Playground: Story = {
  args: { variant: 'primary', size: 'default', children: 'Click me', disabled: false },
};

/** All variants side-by-side */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

/** All sizes side-by-side */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button variant="primary" size="small">Small</Button>
      <Button variant="primary" size="default">Default</Button>
      <Button variant="primary" size="large">Large</Button>
    </div>
  ),
};

/** Button with a leading icon — pick icon and variant from controls */
export const WithIcon: Story = {
  args: { variant: 'primary', size: 'large', children: 'Run Backup Now' },
  argTypes: {
    icon: {
      control: 'select',
      options: Object.keys(iconMap),
      description: 'Leading icon',
      mapping: iconMap,
    },
  },
  render: ({ icon, children, ...rest }: any) => (
    <Button {...rest}>
      {icon && iconMap[icon as keyof typeof iconMap]}
      {children}
    </Button>
  ),
};

/** Disabled state */
export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'Disabled' },
};

/* ================================================================
   IconButton — separate meta exported as named stories
   ================================================================ */

export const IconButtonPlayground: StoryObj<Meta<typeof IconButton>> = {
  argTypes: {
    as: {
      control: 'inline-radio',
      options: ['btn-icon', 'icon-button'],
      description: 'CSS class strategy',
    },
    variant: {
      control: 'inline-radio',
      options: ['default', 'danger'],
    },
    disabled: { control: 'boolean' },
  },
  args: { as: 'btn-icon', variant: 'default', disabled: false, onClick: fn() },
  render: (args: any) => (
    <IconButton {...args}>
      <Plus size={16} />
    </IconButton>
  ),
};

export const IconButtonVariants: StoryObj<Meta<typeof IconButton>> = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <IconButton as="btn-icon"><Plus size={16} /></IconButton>
      <IconButton as="icon-button"><Plus size={16} /></IconButton>
      <IconButton as="btn-icon" variant="danger"><Trash2 size={16} /></IconButton>
    </div>
  ),
};
