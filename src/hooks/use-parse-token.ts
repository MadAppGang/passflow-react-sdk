import { useEffect, useState } from 'react';
import { Token } from '@aooth/aooth-sdk-js';


export type InvitationToken = Token & {
  email: string;
  inviter_id: string;
  inviter_name: string;
  redirect_url: string;
  tenant_name: string;
};

export type TUseParseToken = (token: string | null) => {
  data: Token | InvitationToken | null;
  isError: boolean;
  errorMessage: string;
};

/* eslint-disable prefer-template */
export const useParseToken: TUseParseToken = (token) => {
  const [tokenData, setTokenData] = useState<Token | InvitationToken | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    try {
      if (!token) throw new Error('Token expected');
      const base64Url = token.split('.')[1];

      if (!base64Url) throw new Error('Invalid token');

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );

      const parsedData = JSON.parse(jsonPayload) as Token | InvitationToken;

      setTokenData(parsedData);
      setIsError(false);
      setErrorMessage('');
    } catch (e) {
      const error = e as Error;
      setTokenData(null);
      setIsError(true);
      setErrorMessage(error.message);
    }
  }, [token]);

  return { data: tokenData, isError, errorMessage };
};
