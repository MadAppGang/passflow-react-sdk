import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    plugins: viteConfig.plugins?.filter((plugin) => {
      if (!plugin || Array.isArray(plugin) || typeof plugin === 'function') return true;
      return !('name' in plugin) || plugin.name !== 'vite:dts';
    }),
  }),
};

export default config;
