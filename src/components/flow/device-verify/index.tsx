import {
  DeviceCodeEntryForm,
  DeviceConsentForm,
  DeviceDone,
  DeviceFailed,
  DeviceFullLoginForm,
  DeviceModeDisabled,
  DevicePasskeyForm,
} from '@/components/form/device-verify';
import { useDeviceVerify } from '@/hooks/use-device-verify';
import { deviceErrorOfType } from '@/utils';
import type { FC } from 'react';
import '@/styles/index.css';

/**
 * The RFC 8628 §3.3 device verification page: three UIs behind one URL.
 *
 * Mount this at the verification_uri (Passflow serves it at `/oidc/device`). It
 * needs no props, no router and no PassflowProvider: everything it renders from
 * arrives from GET /oidc/device/info, keyed by the `user_code` on the URL that
 * the QR encoded. A consumer's whole integration is:
 *
 *     if (window.location.pathname === '/oidc/device') return <DeviceVerifyFlow />;
 *
 * ── The modes are the server's decision, not this component's ───────────────
 * The app owner picks the experience via their app's CLI settings; the server
 * pins one mode on the challenge at device_authorization and names exactly one
 * UI here. This component switches on that answer and cannot widen it — notably,
 * an unknown or absent mode has already been degraded to the consent screen
 * (the one mode that carries the §5.4 code check) before it ever reaches this
 * file. See src/web/oidc/device_page.go.
 *
 *   consent     RFC 8628 §5.4: names the CLI, shows the user_code, one tap.
 *   full_login  the ordinary sign-in surface, then the same confirm.
 *   passkey     fires the ceremony on load. Zero taps, and no code check —
 *               an origin-bound passkey cannot be phished, so there is nothing
 *               for the human to compare.
 *
 * ── Nothing here shows a technical string ──────────────────────────────────
 * Every failure below is a classified DeviceError carrying copy written for a
 * person; the underlying exception or server description is in `detail`, which
 * goes to the console and never to the screen. See utils/classify-device-error.ts.
 */
export const DeviceVerifyFlow: FC = () => {
  const device = useDeviceVerify();

  switch (device.status) {
    case 'loading':
      return null;

    case 'code_entry':
      return <DeviceCodeEntryForm error={device.error} onSubmit={device.submitCode} />;

    case 'done':
      // Mode 3 carries its own terminal marker: it is the only mode whose
      // success is not preceded by a tap, so it is the only one where "did this
      // finish?" cannot be inferred from the user having done something.
      return <DeviceDone testId={device.info?.mode === 'passkey' ? 'device-auto-passkey-done' : 'device-done'} />;

    case 'refused':
      // A disabled mode. Renders a refusal and NOTHING approvable.
      return <DeviceModeDisabled error={device.error ?? deviceErrorOfType('mode_disabled')} />;

    case 'failed':
      return <DeviceFailed error={device.error ?? deviceErrorOfType('generic')} onRetry={() => device.submitCode('')} />;

    default:
      break;
  }

  // ready | working | signed_in — the mode's own UI.
  if (!device.info) return null;

  switch (device.info.mode) {
    case 'passkey':
      return <DevicePasskeyForm device={device} />;
    case 'full_login':
      return <DeviceFullLoginForm device={device} />;
    default:
      // `consent`, and anything the server ever adds that this build does not
      // know: degrade toward the screen with the code check, never away from it.
      return <DeviceConsentForm device={device} />;
  }
};
