import { version } from '../../package.json';

declare global {
  interface Window {
    passflowReactAppVersion: () => void;
  }
}

window.passflowReactAppVersion = () => {
  // eslint-disable-next-line no-console
  console.log(`App Version: ${version}`);
};
