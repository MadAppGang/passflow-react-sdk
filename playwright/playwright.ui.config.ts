import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig(baseConfig, {
  use: {
    trace: 'on',
    screenshot: {
      mode: 'on',
      fullPage: true,
    },
  },
});
