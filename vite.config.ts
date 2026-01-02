import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  // Fix AWS SDK compatibility issues with Vite/Rollup
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Bundle AWS SDK packages together
          if (id.indexOf('node_modules/@aws-sdk') !== -1 || id.indexOf('node_modules/@aws-crypto') !== -1) {
            return 'aws-sdk';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@aws-sdk/client-cognito-identity',
      '@aws-sdk/credential-provider-cognito-identity',
      '@aws-crypto/sha256-browser',
      '@aws-crypto/sha256-js',
      '@aws-crypto/util',
      'tslib',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  resolve: {
    alias: {
      // Force all AWS packages to use the same tslib version
      'tslib': 'tslib/tslib.es6.js',
    },
  },
}));
