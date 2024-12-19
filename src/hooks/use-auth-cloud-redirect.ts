import { usePassflow } from './use-passflow';

type UseAuthCloudRedirectProps = (cloudPassflowUrl: string) => () => void;

export const useAuthCloudRedirect: UseAuthCloudRedirectProps = (cloudPassflowUrl: string) => {
  const passflow = usePassflow();

  const redirect = () => passflow.authCloudRedirect(cloudPassflowUrl);

  return redirect;
};
