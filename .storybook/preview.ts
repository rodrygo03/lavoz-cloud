import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Initialise i18n so useTranslation() works in every story
import '../src/i18n';

// Global CSS
import '../src/App.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },

  decorators: [
    // Wrap every story with MemoryRouter so useLocation/useNavigate/Link work
    (Story) => React.createElement(MemoryRouter, null, React.createElement(Story)),
  ],
};

export default preview;
