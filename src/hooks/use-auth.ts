import { useEffect, useState } from 'react';
import { useAooth } from './use-aooth';
import { useValidateToken } from './use-validate-token';
import { Token } from './use-parse-token';
import { defaultScopes } from '@/constants';

enum TokenNames {
  idToken = 'aoothIdToken',
  accessToken = 'aoothAccessToken',
  refreshToken = 'aoothRefreshToken',
}

type TuseAuth = () => {
  isAuth: boolean;
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
  idToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export const useAuth: TuseAuth = () => {
  const aooth = useAooth();
  const [isAuth, setIsAuth] = useState(false);

  const idToken = localStorage.getItem(TokenNames.idToken);
  const accessToken = localStorage.getItem(TokenNames.accessToken);
  const refreshToken = localStorage.getItem(TokenNames.refreshToken);

  const isValidAccessToken = useValidateToken<Token>(accessToken);
  const isValidRefreshToken = useValidateToken<Token>(refreshToken);

  useEffect(() => {
    if (isValidAccessToken) {
      setIsAuth(true);
    } else if (!isValidAccessToken && isValidRefreshToken) {
      void (async () => {
        const response = await aooth.refreshToken(defaultScopes);
        if (response) setIsAuth(true);
      })();
    }
  }, [aooth, isValidAccessToken, isValidRefreshToken]);

  return { isAuth, setIsAuth, idToken, accessToken, refreshToken };
};
