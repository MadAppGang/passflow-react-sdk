import { TokenType, Tokens } from '@aooth/aooth-sdk-js';
import { useAooth } from './use-aooth';

type TuseGetTokens = () => {
  tokens: () => Promise<Tokens | null>;
  tokenByType: (tokenType: TokenType) => string | null;
};

export const useGetTokens: TuseGetTokens = () => {
  const aooth = useAooth();

  const tokens = async () => aooth.getTokens();

  const tokenByType = (tokenType: TokenType) => aooth.getTokenByType(tokenType);

  return { tokens, tokenByType };
};
