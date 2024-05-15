import { version } from '../../../package.json';

declare global {
  interface Window {
    aoothReactAppVersion: () => void;
  }
}

window.aoothReactAppVersion = () => {
  // eslint-disable-next-line no-console
  console.log(`App Version: ${version}`);
};
