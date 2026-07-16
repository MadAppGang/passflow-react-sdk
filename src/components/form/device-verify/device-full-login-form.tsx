import { Button, FieldPassword, FieldText, Icon } from '@/components/ui';
import type { UseDeviceVerifyProps } from '@/hooks/use-device-verify';
import type { FC } from 'react';
import { useState } from 'react';
import { DeviceErrorMessage, DeviceShell } from './device-shell';
import '@/styles/index.css';

/**
 * Mode 2 — the ordinary sign-in surface, then the §5.4 confirm.
 *
 * Signing in and approving are two acts here, and deliberately so: proving who
 * you are is not the same as saying you meant to authorize THIS terminal. The
 * confirm stays disabled until the sign-in lands, which is not cosmetic — it is
 * what makes "sign in, then approve" an ordering rather than a suggestion.
 *
 * ── Why this is not SignInForm ──────────────────────────────────────────────
 * The obvious move is to render the SDK's own <SignInForm/> here, and it is
 * wrong: SignInForm's whole job is to end in TOKENS (useSignIn -> getUrlWithTokens
 * -> redirect), and this page must not issue any. It authenticates the user
 * against the AUTHORIZATION SERVER and hands back a ticket; the terminal gets
 * the tokens, later, from /oidc/token. Reusing SignInForm would drag a token
 * issuance into the one screen that must not have one, and would need a
 * PassflowProvider besides.
 *
 * So this form reuses the same PRIMITIVES the login screen is built from —
 * Wrapper, FieldText, FieldPassword, Button, Icon, and the passflow-form-*
 * classes — and nothing else. It looks like the login screen because it is made
 * of the login screen; it behaves differently because it must.
 */
export const DeviceFullLoginForm: FC<{ device: UseDeviceVerifyProps }> = ({ device }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { info, error, status } = device;
  if (!info) return null;

  const busy = status === 'working';
  const signedIn = device.isAuthenticated || status === 'signed_in';

  return (
    <DeviceShell
      title='Sign in to continue'
      subtitle={`${info.app_name} is asking you to sign in for the device showing code ${info.user_code ?? ''}`.trim()}
      testId='device-full-login'
      className='passflow-device-wrapper'
    >
      <form
        className='passflow-form'
        onSubmit={(e) => {
          e.preventDefault();
          void device.signInWithPassword(email, password);
        }}
      >
        <div className='passflow-form-container'>
          {info.methods.password ? (
            <>
              <div className='passflow-form-field'>
                <div className='passflow-form-field__header'>
                  <label htmlFor='device-email' className='passflow-field-label'>
                    Email
                  </label>
                </div>
                <FieldText
                  id='device-email'
                  name='email'
                  type='email'
                  autoComplete='username'
                  autoCapitalize='off'
                  autoCorrect='off'
                  spellCheck={false}
                  required
                  disabled={busy || signedIn}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className='passflow-form-field'>
                <div className='passflow-form-field__header'>
                  <label htmlFor='device-password' className='passflow-field-label'>
                    Password
                  </label>
                </div>
                <FieldPassword
                  id='device-password'
                  name='password'
                  autoComplete='current-password'
                  passwordPolicy={null}
                  required
                  disabled={busy || signedIn}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          ) : null}

          {signedIn ? (
            <div className='passflow-device-success'>
              <Icon size='small' id='check' type='general' className='icon-success' />
              <span className='passflow-device-success-text'>
                Signed in{device.email ? ` as ${device.email}` : ''}. Now approve the device below.
              </span>
            </div>
          ) : null}

          <DeviceErrorMessage error={error} />
        </div>

        {/*
          The ONLY control on this page whose name says "sign in" — the confirm
          below is named "Approve this device" so the two are never confused, by
          a person or by a test.
        */}
        {info.methods.password && !signedIn ? (
          <Button size='big' variant='primary' type='submit' className='passflow-button-signin' disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </Button>
        ) : null}
      </form>

      {info.methods.passkey && !signedIn ? (
        <Button
          size='big'
          variant='dark'
          type='button'
          className='passflow-button-passkey'
          withIcon
          disabled={busy}
          onClick={() => void device.signInWithPasskey()}
        >
          <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' />
          Sign In with a Passkey
        </Button>
      ) : null}

      <div className='passflow-form-divider'>
        <div className='passflow-form-divider__line-left' />
        <span className='passflow-form-divider__text'>then</span>
        <div className='passflow-form-divider__line-right' />
      </div>

      {/* Disabled until the sign-in lands. See the note at the top. */}
      <Button
        size='big'
        variant='primary'
        type='button'
        data-testid='device-confirm'
        disabled={!signedIn || busy}
        onClick={() => void device.approve()}
      >
        {busy && signedIn ? 'Approving...' : 'Approve this device'}
      </Button>
    </DeviceShell>
  );
};
