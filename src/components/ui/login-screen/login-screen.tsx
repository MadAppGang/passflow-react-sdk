import type { FC } from 'react';
import { LoginCodeEntry } from './code-entry';
import { LoginCredentials } from './credentials';
import { LoginDeviceApproval } from './device-approval';
import { LoginGeneralError } from './general-error';
import { LoginInvitation } from './invitation';
import { LoginPasskeyProgress } from './passkey-progress';
import { LoginScreenShell } from './shell';
import { LoginStatus } from './status';
import type { LoginScreenProps } from './types';

export const LoginScreen: FC<LoginScreenProps> = ({ chrome, state }) => {
  const content = (() => {
    switch (state.kind) {
      case 'credentials':
        return <LoginCredentials {...state} />;
      case 'code-entry':
        return <LoginCodeEntry {...state} />;
      case 'passkey-progress':
        return <LoginPasskeyProgress {...state} />;
      case 'device-approval':
        return <LoginDeviceApproval {...state} />;
      case 'invitation':
        return <LoginInvitation {...state} />;
      case 'general-error':
        return <LoginGeneralError {...state} />;
      case 'status':
        return <LoginStatus {...state} />;
    }
  })();
  const isError = state.kind === 'general-error' || (state.kind === 'status' && state.tone === 'error');
  const className =
    state.kind === 'general-error'
      ? 'passflow-error-wrapper'
      : chrome.variant === 'sign-in'
        ? 'passflow-signin-wrapper'
        : undefined;

  return (
    <LoginScreenShell
      iconId={isError ? 'logo-red' : 'logo'}
      title={chrome.title}
      subtitle={chrome.subtitle}
      className={className}
      customCss={chrome.customCss}
      customLogo={chrome.customLogo}
      customLogoAlt={chrome.customLogoAlt}
      removeBranding={chrome.removeBranding}
    >
      {content}
    </LoginScreenShell>
  );
};
