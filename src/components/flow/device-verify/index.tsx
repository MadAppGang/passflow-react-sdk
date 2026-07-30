import { LoginScreen } from '@/components/ui';
import { useDeviceVerify } from '@/hooks/use-device-verify';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { getDeviceLoginScreenProps } from './screen';

/**
 * RFC 8628 device verification controller.
 *
 * The server selects consent, full-login, or passkey mode. This component owns
 * the state transition and automatic passkey attempt; the Storybook-backed
 * LoginScreen owns every visual state.
 */
export const DeviceVerifyFlow: FC = () => {
  const device = useDeviceVerify();
  const attemptedPasskeyChallenge = useRef<string | null>(null);
  const { confirmWithPasskey } = device;
  const challengeKey = device.info?.csrf_token ?? null;
  const isAutomaticPasskeyReady = device.info?.mode === 'passkey' && device.status === 'ready' && !device.error;

  useEffect(() => {
    if (!isAutomaticPasskeyReady || !challengeKey || attemptedPasskeyChallenge.current === challengeKey) return;

    attemptedPasskeyChallenge.current = challengeKey;
    void confirmWithPasskey();
  }, [challengeKey, confirmWithPasskey, isAutomaticPasskeyReady]);

  const screen = getDeviceLoginScreenProps(device);
  return screen ? <LoginScreen {...screen} /> : null;
};
