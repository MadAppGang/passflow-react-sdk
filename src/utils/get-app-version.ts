import { version } from '../../package.json';

declare global {
  interface Window {
    passflowReactAppVersion: () => void;
  }
}

// Runs when the module loads, so it must not assume a browser: SSR and plain Node have no window.
if (typeof window !== 'undefined') {
  window.passflowReactAppVersion = () => {
    // eslint-disable-next-line no-console
    console.log(`App Version: ${version}`);
  };
}
