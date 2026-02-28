import { ErrorComponent } from '@/components/error';
import { Wrapper } from '@/components/form/wrapper';
import { Button, Icon } from '@/components/ui';
import { withError } from '@/hocs';
import { useCLIAuth } from '@/hooks/use-cli-auth';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import '@/styles/index.css';

const CLIQRAuthForm: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  const { authenticate, state, error } = useCLIAuth(sessionId);

  const handleAuthenticate = async () => {
    await authenticate();
  };

  return (
    <Wrapper title='CLI Authentication' subtitle='Authenticate for your CLI application' className='passflow-cli-auth-wrapper'>
      <div className='passflow-form'>
        {state === 'loading' && (
          <div className='passflow-form-container'>
            <p className='passflow-form-text'>Loading authentication session...</p>
          </div>
        )}

        {state === 'pending' && (
          <>
            <div className='passflow-form-container'>
              <p className='passflow-form-text'>Tap the button below to authenticate with your passkey.</p>
            </div>
            <Button
              size='big'
              variant='dark'
              type='button'
              className='passflow-button-passkey'
              withIcon
              onClick={handleAuthenticate}
            >
              <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' />
              Authenticate with Passkey
            </Button>
          </>
        )}

        {state === 'authenticating' && (
          <div className='passflow-form-container'>
            <p className='passflow-form-text'>Authenticating...</p>
          </div>
        )}

        {state === 'completed' && (
          <div className='passflow-form-container'>
            <div className='passflow-form-success'>
              <Icon size='small' id='check' type='general' className='icon-success' />
              <p className='passflow-form-success-text'>Authentication successful!</p>
            </div>
            <p className='passflow-form-text'>You can close this app and return to your terminal.</p>
          </div>
        )}

        {state === 'expired' && (
          <div className='passflow-form-container'>
            <div className='passflow-form-error'>
              <Icon size='small' id='warning' type='general' className='icon-warning' />
              <span className='passflow-form-error-text'>Session Expired</span>
            </div>
            <p className='passflow-form-text'>
              This authentication session has expired. Please start a new one from your terminal.
            </p>
          </div>
        )}

        {state === 'error' && error && (
          <div className='passflow-form-container'>
            <div className='passflow-form-error'>
              <Icon size='small' id='warning' type='general' className='icon-warning' />
              <span className='passflow-form-error-text'>{error}</span>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export const CLIQRAuth = withError(CLIQRAuthForm, ErrorComponent);
