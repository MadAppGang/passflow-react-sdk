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
  // Storybook does not need declaration files; drop the d.ts plugin from the
  // library build config (vite-plugin-dts 5 registers as 'unplugin-dts').
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    plugins: viteConfig.plugins?.filter((plugin) => {
      if (!plugin || Array.isArray(plugin) || typeof plugin === 'function') return true;
      return !('name' in plugin) || plugin.name !== 'unplugin-dts';
    }),
  }),
};

export default config;
