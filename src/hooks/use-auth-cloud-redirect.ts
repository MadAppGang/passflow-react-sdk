import { usePassflow } from './use-passflow';

type UseAuthCloudRedirectProps = (cloudPassflowUrl: string) => () => void;

export const useAuthCloudRedirect: UseAuthCloudRedirectProps = (cloudPassflowUrl: string) => {
  const passflow = usePassflow();

  // A failed redirect is reported by core's `Error` event (operation `auth-redirect`); the page stays where it is.
  const redirect = () => {
    passflow.authRedirect({ url: cloudPassflowUrl }).catch(() => {});
  };

  return redirect;
};
