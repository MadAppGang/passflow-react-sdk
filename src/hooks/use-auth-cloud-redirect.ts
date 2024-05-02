import { useAooth } from './use-aooth';

type TuseAuthCloudRedirect = (cloudAoothUrl: string) => () => void;

export const useAuthCloudRedirect: TuseAuthCloudRedirect = (cloudAoothUrl: string) => {
  const aooth = useAooth();

  const redirect = () => aooth.authCloudRedirect(cloudAoothUrl);

  return redirect;
};
