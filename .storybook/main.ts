import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/react-vite",

  viteFinal(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Redirect Tauri native modules to our mocks so stories render in the browser
      '@tauri-apps/api/core': path.resolve(__dirname, '../src/__mocks__/tauri.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, '../src/__mocks__/tauriDialog.ts'),
    };
    // Set base path for GitHub Pages
    if (process.env.GITHUB_ACTIONS) {
      config.base = '/lavoz-cloud/';
    }
    return config;
  },
};

export default config;
