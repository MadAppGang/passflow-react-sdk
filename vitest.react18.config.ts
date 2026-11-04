import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

const react18 = path.resolve(__dirname, './node_modules/react-18');
const reactDom18 = path.resolve(__dirname, './node_modules/react-dom-18');
// axios is not a dependency of this package. The landing harness stubs the adapter on
// the instance @passflow/core uses, so it has to import core's own copy.
const coreAxios = path.dirname(
  createRequire(realpathSync(path.resolve(__dirname, './node_modules/@passflow/core/package.json'))).resolve(
    'axios/package.json',
  ),
);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // resolve-react18 comes first: it must be in place before anything loads react-dom-18.
    setupFiles: ['./tests/react18/resolve-react18.ts', './src/test/setup.ts'],
    include: ['tests/react18/**/*.test.tsx'],
    server: {
      deps: {
        // Externalized packages import React natively, past the aliases below, so every
        // runtime package that imports React is inlined (from the lockfile's snapshots).
        // react-dom-18 stays external: resolve-react18.ts covers its require('react').
        inline: [
          /\/node_modules\/(@floating-ui|@radix-ui|@tanstack\/react-router|@tanstack\/react-store|@testing-library\/react)\//,
          /\/node_modules\/(input-otp|react-error-boundary|react-hook-form|react-international-phone)\//,
          /\/node_modules\/(react-remove-scroll|react-remove-scroll-bar|react-router|react-style-singleton)\//,
          /\/node_modules\/(use-callback-ref|use-sidecar|use-sync-external-store|wouter)\//,
        ],
      },
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^@passflow\/react$/, replacement: path.resolve(__dirname, './src/index.ts') },
      { find: /^axios$/, replacement: coreAxios },
      { find: /^react$/, replacement: path.join(react18, 'index.js') },
      { find: /^react\/jsx-runtime$/, replacement: path.join(react18, 'jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.join(react18, 'jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: path.join(reactDom18, 'index.js') },
      { find: /^react-dom\/client$/, replacement: path.join(reactDom18, 'client.js') },
      { find: /^react-dom\/server$/, replacement: path.join(reactDom18, 'server.js') },
      // @testing-library/react imports this one too.
      { find: /^react-dom\/test-utils$/, replacement: path.join(reactDom18, 'test-utils.js') },
    ],
  },
});
