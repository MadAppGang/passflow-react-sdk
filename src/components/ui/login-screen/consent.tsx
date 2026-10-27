import type { FC } from 'react';
import { Button } from '../button';
import { Switch } from '../switch';
import { LoginAlert, LoginProgress, LoginScreenNotice } from './shared';
import type { LoginConsentState } from './types';

/**
 * The OIDC consent screen: which scopes an application is asking for, and the
 * two decisions a user can make about them.
 *
 * Every scope starts granted and can be switched off individually — the Allow
 * button submits the subset that is still on, so "Allow" never grants more than
 * what is visible on screen. Deny is a peer of Allow, not a hidden link: a
 * consent screen where refusing is harder than accepting is a dark pattern.
 * For the same reason neither button takes initial focus: a bare Enter on a
 * freshly loaded screen must not grant every requested scope.
 */
export const LoginConsent: FC<LoginConsentState> = ({
  appName,
  scopes,
  prompt = 'wants to access your account.',
  busy = false,
  error,
  allowLabel = 'Allow',
  denyLabel = 'Deny',
  busyLabel = 'Submitting…',
  testId,
  allowTestId,
  denyTestId,
  appNameTestId,
  onToggleScope,
  onAllow,
  onDeny,
}) => (
  <div className='passflow-form' data-testid={testId} aria-busy={busy}>
    <LoginScreenNotice appName={appName} message={prompt} appNameTestId={appNameTestId} />

    <div className='passflow-form-container'>
      <LoginAlert message={error} />

      {scopes.length ? (
        <ul className='passflow-consent-scopes'>
          {scopes.map((item) => (
            <li key={item.scope} className='passflow-consent-scope' data-testid={`consent-scope-${item.scope}`}>
              <Switch label={item.label} checked={item.granted} disabled={busy} onChange={() => onToggleScope(item.scope)} />
              {item.description ? <p className='passflow-consent-scope-description'>{item.description}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className='passflow-login-screen-hint'>This application is not requesting access to any of your data.</p>
      )}
    </div>

    {busy ? <LoginProgress message={busyLabel} /> : null}

    <div className='passflow-consent-actions'>
      <Button size='big' variant='primary' type='button' data-testid={allowTestId} disabled={busy} onClick={onAllow}>
        {allowLabel}
      </Button>
      <Button size='big' variant='outlined' type='button' data-testid={denyTestId} disabled={busy} onClick={onDeny}>
        {denyLabel}
      </Button>
    </div>
  </div>
);
