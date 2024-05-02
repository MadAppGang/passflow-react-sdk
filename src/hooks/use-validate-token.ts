import dayjs from 'dayjs';
import { InvitationToken, Token, useParseToken } from './use-parse-token';

export const useValidateToken = <T extends Token | InvitationToken>(token: string | null): boolean => {
  const { data, isError } = useParseToken(token);
  if (data && !isError) {
    const { exp } = data as T;

    if (exp) {
      const expDate = dayjs.unix(exp);

      return dayjs().isBefore(expDate);
    }
  }

  return false;
};
