import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'path';

// axios is not a dependency of this package. The landing harness stubs the adapter on
// the instance @passflow/core uses, so it has to import core's own copy.
const coreAxios = path.dirname(
  createRequire(realpathSync(path.resolve(__dirname, './node_modules/@passflow/core/package.json'))).resolve(
    'axios/package.json'
  )
);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // tests/unit holds black-box tests that import the package by its public name.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts',
        'src/test/**',
        'src/types/**',
        'src/styles/**'
      ]
    }
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // The package's own name resolves to its sources, not to a built dist/.
      { find: /^@passflow\/react$/, replacement: path.resolve(__dirname, './src/index.ts') },
      { find: /^axios$/, replacement: coreAxios }
    ]
  }
});
