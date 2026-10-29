import { useNavigation, usePassflow } from '@/hooks';
import { Passflow } from '@passflow/core';
import { render, waitFor } from '@testing-library/react';
import { type FC, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PassflowProvider } from '../passflow-provider';

// A federated sign-in on a non-PKCE app lands back on its redirect URL with
// the 2FA token in the fragment and no tokens. These render the real provider
// over the real core, which adopts the token as it is constructed.
// Built here rather than written out: a JWT-shaped literal reads as a leaked
// secret to the repository's secret scanner.
const segment = (value: string) => btoa(value).replace(/=+$/, '');
const TFA_TOKEN = [segment('{"alg":"HS256"}'), segment('{"sub":"user"}'), segment('signature')].join('.');

let owesFactor: boolean | undefined;

const Probe: FC<{ flowPath?: string }> = ({ flowPath }) => {
  const passflow = usePassflow();
  const { setTwoFactorVerifyPath } = useNavigation();
  owesFactor = passflow.isTwoFactorVerificationRequired();
  // Stands in for a mounted PassflowFlow registering its prefixed route.
  useEffect(() => {
    if (flowPath) setTwoFactorVerifyPath?.(flowPath);
  }, [flowPath, setTwoFactorVerifyPath]);
  return null;
};

const renderProvider = (navigate: ReturnType<typeof vi.fn>, props: { twoFactorVerifyPath?: string; flowPath?: string } = {}) =>
  render(
    <PassflowProvider
      appId='app-1'
      url='http://localhost:7999'
      navigate={navigate}
      twoFactorVerifyPath={props.twoFactorVerifyPath}
    >
      <Probe flowPath={props.flowPath} />
    </PassflowProvider>,
  );

describe('PassflowProvider on a landing that owes its second factor', () => {
  beforeEach(() => {
    sessionStorage.clear();
    owesFactor = undefined;
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    sessionStorage.clear();
  });

  it('adopts the 2FA token and goes to the 2FA screen', async () => {
    window.history.replaceState(null, '', `/dashboard#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/two-factor-verify', replace: true }));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(owesFactor).toBe(true);
    expect(window.location.hash).toBe('');
  });

  it("goes to a mounted flow's own (prefixed) 2FA route", async () => {
    window.history.replaceState(null, '', `/web/signin#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate, { twoFactorVerifyPath: '/elsewhere', flowPath: '/web/two-factor-verify' });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/web/two-factor-verify', replace: true }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('uses the twoFactorVerifyPath prop when no flow is mounted', async () => {
    window.history.replaceState(null, '', `/dashboard#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate, { twoFactorVerifyPath: '/auth/two-factor-verify' });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/auth/two-factor-verify', replace: true }));
  });

  it('leaves a signed-in user where they are', async () => {
    // A `#tfa_token=` link planted on a signed-in user is not theirs to answer.
    const signedIn = vi.spyOn(Passflow.prototype, 'isAuthenticated').mockReturnValue(true);
    window.history.replaceState(null, '', `/dashboard#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate);

    await waitFor(() => expect(owesFactor).not.toBeUndefined());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(navigate).not.toHaveBeenCalled();
    signedIn.mockRestore();
  });

  it('leaves an ordinary page load alone', async () => {
    window.history.replaceState(null, '', '/dashboard#section=billing');
    const navigate = vi.fn();

    renderProvider(navigate);

    await waitFor(() => expect(owesFactor).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
  });
});
