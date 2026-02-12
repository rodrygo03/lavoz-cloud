import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import {
  Folder,
  Clock,
  Activity,
  FileText,
  Cloud,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

const iconOptions = {
  Activity: <Activity size={48} />,
  Folder: <Folder size={48} />,
  Clock: <Clock size={48} />,
  FileText: <FileText size={48} />,
  Cloud: <Cloud size={48} />,
  Settings: <Settings size={48} />,
  AlertTriangle: <AlertTriangle size={48} />,
};

const smallIconOptions = {
  Activity: <Activity size={24} />,
  Folder: <Folder size={24} />,
  Clock: <Clock size={24} />,
  FileText: <FileText size={24} />,
  Cloud: <Cloud size={24} />,
  Settings: <Settings size={24} />,
  AlertTriangle: <AlertTriangle size={24} />,
};

const meta = {
  title: 'Primitives/EmptyState',
  component: EmptyState,
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['default', 'small'],
      description: 'Layout size variant',
    },
    title: { control: 'text', description: 'Heading text' },
    description: { control: 'text', description: 'Description paragraph' },
    icon: {
      control: 'select',
      options: Object.keys(iconOptions),
      mapping: iconOptions,
      description: 'Icon to display',
    },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tweak icon, title, description, and size live */
export const Playground: Story = {
  args: {
    icon: 'Activity' as any,
    title: 'No Profile Selected',
    description: 'Select a profile from the sidebar to get started.',
    size: 'default',
  },
};

/** Empty state with an action button */
export const WithAction: Story = {
  argTypes: {
    buttonLabel: { control: 'text', description: 'Action button label' },
    buttonVariant: {
      control: 'inline-radio',
      options: ['primary', 'secondary'],
      description: 'Action button variant',
    },
  },
  args: {
    icon: 'Folder' as any,
    title: 'No Files Found',
    description: 'This folder is empty.',
    size: 'default',
    buttonLabel: 'Upload Files',
    buttonVariant: 'primary',
  } as any,
  render: ({ buttonLabel, buttonVariant, ...rest }: any) => (
    <EmptyState {...rest}>
      <Button variant={buttonVariant} onClick={fn()}>{buttonLabel}</Button>
    </EmptyState>
  ),
};

/** Small variant (used inside cards) — switch icon/text from controls */
export const SmallPlayground: Story = {
  argTypes: {
    icon: {
      control: 'select',
      options: Object.keys(smallIconOptions),
      mapping: smallIconOptions,
      description: 'Icon (small)',
    },
  },
  args: {
    size: 'small',
    icon: 'Clock' as any,
    title: 'No backups yet',
    description: '',
  },
};
