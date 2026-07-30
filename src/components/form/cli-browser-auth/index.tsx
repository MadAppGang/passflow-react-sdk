import { ErrorComponent } from '@/components/error';
import { withError } from '@/hocs';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { CLIAuthLogin } from '../cli-auth';

const CLIBrowserAuthForm: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  return <CLIAuthLogin sessionId={sessionId} surface='browser' />;
};

export const CLIBrowserAuth = withError(CLIBrowserAuthForm, ErrorComponent);
