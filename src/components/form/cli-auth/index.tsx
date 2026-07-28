import { LoginScreen } from '@/components/ui';
import { useCLIAuth } from '@/hooks/use-cli-auth';
import type { FC } from 'react';
import { type CLIAuthSurface, getCLILoginScreenProps } from './screen';

export type CLIAuthLoginProps = {
  sessionId: string;
  surface: CLIAuthSurface;
};

export const CLIAuthLogin: FC<CLIAuthLoginProps> = ({ sessionId, surface }) => {
  const cli = useCLIAuth(sessionId);
  return <LoginScreen {...getCLILoginScreenProps(cli, surface)} />;
};
