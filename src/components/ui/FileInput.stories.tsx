import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Folder } from 'lucide-react';
import { FileInput } from './FileInput';
import { Button, IconButton } from './Button';

const meta = {
  title: 'Primitives/FileInput',
  component: FileInput,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive — type a path or click browse */
export const Playground: Story = {
  argTypes: {
    showAutoSetup: { control: 'boolean', description: 'Show auto-setup button' },
  },
  args: { showAutoSetup: false } as any,
  render: function Render({ showAutoSetup }: any) {
    const [value, setValue] = useState('/usr/local/bin/rclone');
    return (
      <FileInput
        actions={
          <>
            <IconButton onClick={fn()}>
              <Folder size={16} />
            </IconButton>
            {showAutoSetup && (
              <Button variant="secondary" onClick={fn()}>
                Auto-Setup
              </Button>
            )}
          </>
        }
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Path to file..."
        />
      </FileInput>
    );
  },
};

/** With browse button only */
export const WithBrowse: Story = {
  args: {
    children: <input type="text" value="/usr/local/bin/rclone" readOnly />,
    actions: (
      <IconButton onClick={fn()}>
        <Folder size={16} />
      </IconButton>
    ),
  },
};

/** With browse and auto-setup buttons */
export const WithMultipleActions: Story = {
  args: {
    children: <input type="text" value="/usr/local/bin/rclone" readOnly />,
    actions: (
      <>
        <IconButton onClick={fn()}>
          <Folder size={16} />
        </IconButton>
        <Button variant="secondary" onClick={fn()}>
          Auto-Setup
        </Button>
      </>
    ),
  },
};
