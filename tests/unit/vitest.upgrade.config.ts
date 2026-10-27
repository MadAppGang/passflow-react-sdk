import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config';

// After transplanting this tree to <react-package>/tests/unit, extend the
// package-root config, which otherwise discovers src/** only. Run from that root.
export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
}));
