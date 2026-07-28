import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';
import '../src/styles/index.css';
import './preview.css';

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        Light: 'storybook-passflow-light',
        Dark: 'storybook-passflow-dark',
        Brand: 'storybook-passflow-brand',
      },
      defaultTheme: 'Light',
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    a11y: {
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: {
        mobile: {
          name: 'Mobile',
          styles: { width: '390px', height: '844px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
      },
    },
  },
};

export default preview;
