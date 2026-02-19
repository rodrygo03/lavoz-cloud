import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AlertTriangle } from 'lucide-react';
import { Modal, ModalHeader, ModalContent, ModalActions } from './Modal';
import { Button } from './Button';
import { AlertBox } from './AlertBox';

const meta = {
  title: 'Primitives/Modal',
  component: Modal,
  args: {
    open: true,
    onClose: fn(),
  },
  argTypes: {
    open: { control: 'boolean', description: 'Toggle modal visibility' },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tweak title, body text, and button labels live */
export const Playground: Story = {
  argTypes: {
    title: { control: 'text', description: 'Modal header title' },
    body: { control: 'text', description: 'Modal body content' },
    cancelLabel: { control: 'text', description: 'Cancel button label' },
    confirmLabel: { control: 'text', description: 'Confirm button label' },
    confirmVariant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'danger'],
      description: 'Confirm button variant',
    },
  },
  args: {
    open: true,
    title: 'Sync Preview',
    body: '3 files to copy, 1 file to update, 0 files to delete.',
    cancelLabel: 'Cancel',
    confirmLabel: 'Confirm',
    confirmVariant: 'primary',
  } as any,
  render: ({ open, onClose, title, body, cancelLabel, confirmLabel, confirmVariant }: any) => (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title={title} onClose={onClose} />
      <ModalContent>
        <p>{body}</p>
      </ModalContent>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
        <Button variant={confirmVariant} onClick={fn()}>{confirmLabel}</Button>
      </ModalActions>
    </Modal>
  ),
};

/** Danger confirmation with warning alert */
export const DangerConfirmation: Story = {
  argTypes: {
    warningText: { control: 'text', description: 'Warning message' },
  },
  args: {
    open: true,
    warningText: 'This operation will delete 5 files from the cloud. This action cannot be undone.',
  } as any,
  render: ({ open, onClose, warningText }: any) => (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="Sync Preview" onClose={onClose} />
      <ModalContent>
        <AlertBox variant="warning" icon={<AlertTriangle size={16} />}>
          <div><strong>Warning:</strong> {warningText}</div>
        </AlertBox>
      </ModalContent>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={fn()}>Confirm &amp; Run Sync</Button>
      </ModalActions>
    </Modal>
  ),
};

/** Fully interactive — click to open/close */
export const Interactive: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: '2rem' }}>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal open={open} onClose={() => setOpen(false)}>
          <ModalHeader title="Interactive Modal" onClose={() => setOpen(false)} />
          <ModalContent>
            <p>Click outside or the &times; to close.</p>
          </ModalContent>
          <ModalActions>
            <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
          </ModalActions>
        </Modal>
      </div>
    );
  },
};
