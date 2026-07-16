import { Button } from '@/components/ui';
import type { DeviceVerifyInfo, UseDeviceVerifyProps } from '@/hooks/use-device-verify';
import type { FC } from 'react';
import { SignIn, type SignInDeviceApprove } from '../signin';
import '@/styles/index.css';

/**
 * Modes 1 (device-code consent) & 2 (full login), rendered as the REAL login.
 *
 * ── Why this is not a rebuilt sign-in form ──────────────────────────────────
 * It renders `<SignIn/>` — the exact component a user meets at /web/signin, with
 * the same logo, fields, black passkey button and layout — and reaches it via
 * the additive `deviceApprove` seam rather than a copy. The login card and the
 * device card are therefore ONE component that changes in ONE place; the only
 * thing this file adds is the device-specific chrome the login has no reason to
 * carry: the §5.4 code banner (in the header slot) and the approval wiring.
 *
 * ── The two variants keep the authenticate/approve split ────────────────────
 * Signing in and approving stay two acts (see use-device-verify.ts). What
 * differs is only where the tap lands:
 *
 *   consent     one tap — the primary button authenticates AND approves
 *               (confirmWithPassword). The §5.4 check is that the human read the
 *               code in the banner first, which is exactly what the tap means.
 *   full_login  the primary button only authenticates; a separate, gated Approve
 *               releases the grant. Sign-in alone must never approve.
 *
 * Either way the code is shown FIRST, and neither variant issues tokens in the
 * browser: approval solves the device parent so the CLI's /oidc/token poll gets
 * them. Session-exchange auto-approval is refused server-side and skipped in the
 * provider (STORM-2372); see src/web/api/session_exchange.go.
 */

/**
 * The RFC 8628 §5.4 anti-phishing banner: the code to compare against the
 * terminal, and the name of the app that asked. Rendered in SignIn's header slot
 * so it sits inside the login card. The `device-consent-*` testids are the seam
 * the Playwright suite grips.
 */
const DeviceApprovalBanner: FC<{ info: DeviceVerifyInfo }> = ({ info }) => (
  <div className='passflow-device-banner' role='note'>
    {info.user_code ? (
      <div className='passflow-device-code' data-testid='device-consent-user-code'>
        {info.user_code}
      </div>
    ) : null}
    <p className='passflow-device-text passflow-device-centered-text'>
      <span className='passflow-device-app-name' data-testid='device-consent-app-name'>
        {info.app_name}
      </span>{' '}
      is asking to sign in on the device showing this code. If it doesn&apos;t match, close this page.
    </p>
  </div>
);

export const DeviceLoginApprove: FC<{
  device: UseDeviceVerifyProps;
  variant: 'consent' | 'full_login';
}> = ({ device, variant }) => {
  const { info, error, status } = device;
  if (!info) return null;

  const busy = status === 'working';
  const signedIn = device.isAuthenticated || status === 'signed_in';
  const rootTestId = variant === 'consent' ? 'device-consent' : 'device-full-login';
  const errorMessage = error?.message ?? null;

  const deviceApprove: SignInDeviceApprove =
    variant === 'consent'
      ? {
          // One tap: authenticate then approve, back-to-back (confirmWithPassword).
          onPassword: (email, password) => void device.confirmWithPassword(email, password),
          onPasskey: () => void device.confirmWithPasskey(),
          busy,
          error: errorMessage,
          primaryLabel: busy ? 'Approving…' : 'Approve',
          primaryTestId: 'device-confirm',
        }
      : {
          // Authenticate only — the separate Approve below releases the grant.
          onPassword: (email, password) => void device.signInWithPassword(email, password),
          onPasskey: () => void device.signInWithPasskey(),
          busy,
          error: errorMessage,
          primaryLabel: busy && !signedIn ? 'Signing in…' : 'Sign In',
          afterForm: (
            <>
              <div className='passflow-form-divider'>
                <div className='passflow-form-divider__line-left' />
                <span className='passflow-form-divider__text'>then</span>
                <div className='passflow-form-divider__line-right' />
              </div>
              {signedIn ? (
                <p className='passflow-device-hint passflow-device-centered-text'>
                  Signed in{device.email ? ` as ${device.email}` : ''}. Approve the device to finish.
                </p>
              ) : null}
              <Button
                size='big'
                variant='primary'
                type='button'
                data-testid='device-confirm'
                disabled={!signedIn || busy}
                onClick={() => void device.approve()}
              >
                {busy && signedIn ? 'Approving…' : 'Approve this device'}
              </Button>
            </>
          ),
        };

  return (
    <div data-testid={rootTestId} className='passflow-device-approve'>
      <SignIn header={<DeviceApprovalBanner info={info} />} deviceApprove={deviceApprove} />
    </div>
  );
};
