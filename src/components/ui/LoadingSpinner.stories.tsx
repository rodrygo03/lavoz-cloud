import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingSpinner, LoadingState } from './LoadingSpinner';

const spinnerMeta = {
  title: 'Primitives/LoadingSpinner',
  component: LoadingSpinner,
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['default', 'small'],
      description: 'Spinner size',
    },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof LoadingSpinner>;

export default spinnerMeta;
type SpinnerStory = StoryObj<typeof spinnerMeta>;

/** Toggle between default and small sizes */
export const Playground: SpinnerStory = {
  args: { size: 'default' },
};

/* ---- LoadingState stories ---- */

/** Full loading state — edit the message text live */
export const LoadingStatePlayground: StoryObj<Meta<typeof LoadingState>> = {
  argTypes: {
    text: { control: 'text', description: 'Loading message' },
  },
  args: { text: 'Loading files...' },
  render: (args: any) => <LoadingState {...args} />,
};

/** Loading state without text */
export const LoadingStateNoText: StoryObj<Meta<typeof LoadingState>> = {
  render: () => <LoadingState />,
};
