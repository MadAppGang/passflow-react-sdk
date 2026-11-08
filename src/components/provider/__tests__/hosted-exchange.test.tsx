import { Passflow } from '@passflow/core';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appId,
  deferred,
  type HttpReply,
  installLandingEnvironment,
  jwt,
  LandingTree,
  makeObserved,
  type Network,
  renderLanding,
} from './support/federated-harness';

const exchangePath = '/auth/session/exchange';
const callback = 'https://rp.example.com/callback';
const state = 'original state +/&=?';
const destination = `${callback}?code=exchanged`;
const parent = { request_id: 'parent-1', redirect_uri: callback, state };
const deliveryModes = ['query', 'form_post'] as const;
type DeliveryMode = (typeof deliveryModes)[number];
const constraints = [
  { name: 'assurance', body: { acr_values: '2' } },
  { name: 'freshness', body: { max_age: 60 } },
  { name: 'both', body: { acr_values: '2', max_age: 60 } },
] as const;
type Submission = { form: HTMLFormElement; attached: boolean; hidden: boolean };
let network: Network | undefined;
let submitted: Submission[] = [];
let assigned: string[] = [];

afterEach(() => {
  for (const { form } of submitted) form.remove();
  network?.restore();
  network = undefined;
  submitted = [];
  assigned = [];
});

function installHosted(metadata: Record<string, unknown> = parent, metadataStatus = 200) {
  const active = installLandingEnvironment({
    pathname: '/web/signin',
    search: `?appid=${appId}&parent_challenge_id=parent-1`,
  });
  network = active;
  const assign = window.location.assign;
  vi.spyOn(window.location, 'assign').mockImplementation((url) => {
    assigned.push(String(url));
    assign.call(window.location, url);
  });
  active.endpoints.set('/oidc/requests/parent-1', { data: metadata, status: metadataStatus });
  vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
    const style = window.getComputedStyle(this);
    submitted.push({
      form: this,
      attached: this.isConnected,
      hidden: this.hidden || style.display === 'none' || style.visibility === 'hidden',
    });
  });
  return active;
}

function expectNoSignIn() {
  expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/password/i, { selector: 'input' })).not.toBeInTheDocument();
}

async function expectSignIn(active: Network) {
  expect(await screen.findByRole('textbox', { name: /email/i })).toBeVisible();
  expect(active.forwards).toEqual([]);
  expect(submitted).toEqual([]);
}

function expectExchanges(active: Network, count: number) {
  const exchanges = active.requests.filter((request) => request.path === exchangePath);
  expect(exchanges).toHaveLength(count);
  for (const request of exchanges) {
    expect(request.method.toUpperCase()).toBe('POST');
    expect(request.body).toEqual({ parent_challenge_id: 'parent-1' });
    const headers = new Headers(request.headers);
    expect(headers.get('X-Passflow-ClientID')).toBe(appId);
    expect(headers.has('Authorization')).toBe(false);
  }
  expect(active.requests.filter((request) => request.path === '/auth/refresh')).toEqual([]);
}

function submittedFields() {
  expect(submitted).toHaveLength(1);
  const submission = submitted[0]!;
  expect(submission.attached).toBe(true);
  expect(submission.hidden).toBe(true);
  expect(submission.form.method.toUpperCase()).toBe('POST');
  expect(submission.form.action).toBe(callback);
  const inputs = Array.from(submission.form.querySelectorAll('input'));
  for (const input of inputs) expect(input.type).toBe('hidden');
  const fields = Object.fromEntries(inputs.map((input) => [input.name, input.value]));
  expect(inputs).toHaveLength(Object.keys(fields).length);
  return fields;
}

async function expectRpError(active: Network, error: string, mode: DeliveryMode) {
  if (mode === 'query') {
    await waitFor(() => expect(active.forwards).toHaveLength(1));
    const answer = new URL(active.forwards[0]!);
    expect(answer.origin + answer.pathname).toBe(callback);
    expect(answer.searchParams.get('error')).toBe(error);
    expect(answer.searchParams.get('state')).toBe(state);
    expect(submitted).toEqual([]);
  } else {
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submittedFields()).toEqual({ error, error_description: expect.any(String), state });
    expect(active.forwards).toEqual([]);
  }
  expectNoSignIn();
}

async function mountHeld(metadata: Record<string, unknown> = parent, metadataStatus = 200) {
  const active = installHosted(metadata, metadataStatus);
  const first = deferred<HttpReply>();
  active.endpoints.set(exchangePath, first.promise);
  const observed = makeObserved();
  const view = renderLanding({ observed, flow: true });
  await active.releaseSettings();
  // Hold the exchange at the HTTP boundary, without requiring child hooks to update while it is pending.
  await waitFor(() => {
    expect(active.requests.some((request) => request.path === exchangePath)).toBe(true);
  });
  return { active, first, observed, view };
}

type Held = Awaited<ReturnType<typeof mountHeld>>;

async function releaseFirst(held: Held, reply: HttpReply) {
  await act(async () => {
    held.first.resolve(reply);
  });
}

const upgradePath = '/auth/session/upgrade';

function expectNoElevation(active: Network) {
  expect(screen.queryByTestId('upgrade-dialog')).not.toBeInTheDocument();
  expect(active.requests.filter((request) => request.path === upgradePath)).toEqual([]);
}

async function finishElevation(held: Held, retry: HttpReply) {
  held.active.endpoints.set(upgradePath, { data: null, status: 204 });
  held.active.endpoints.set(exchangePath, retry);
  fireEvent.click(screen.getByTestId('upgrade-dialog-alternatives'));
  fireEvent.click(screen.getByTestId('upgrade-dialog-factor-totp'));
  fireEvent.change(screen.getByTestId('upgrade-dialog-code'), { target: { value: '123456' } });
  await act(async () => {
    fireEvent.click(screen.getByTestId('upgrade-dialog-submit'));
  });
  await waitFor(() => {
    const upgrades = held.active.requests.filter((request) => request.path === upgradePath);
    expect(upgrades).toHaveLength(1);
    expect(upgrades[0]!.method.toUpperCase()).toBe('POST');
    expect(upgrades[0]!.body).toMatchObject({ type: 'totp' });
  });
}

async function dismissSuccessfulElevation() {
  const dismiss = await screen.findByTestId('upgrade-dialog-dismiss');
  await act(async () => {
    fireEvent.click(dismiss);
  });
}

async function rejectElevation(held: Held) {
  await act(async () => {
    fireEvent.click(screen.getByTestId('upgrade-dialog-cancel'));
  });
  expectNoElevation(held.active);
}

async function expectElevationPending(held: Held) {
  await waitFor(() => expect(screen.getByTestId('upgrade-dialog')).toBeVisible());
  expectNoSignIn();
  expect(held.active.forwards).toEqual([]);
  expect(submitted).toEqual([]);
  expectExchanges(held.active, 1);
}

describe('hosted cookie exchange', () => {
  for (const scenario of [
    { name: 'no stored tokens', metadata: {}, stored: false, expired: false },
    { name: 'valid stored tokens', metadata: {}, stored: true, expired: false },
    { name: 'prompt_login with old stored tokens', metadata: { oidc_prompt_login: true }, stored: true, expired: true },
    { name: 'max_age with old stored tokens', metadata: { max_age: 60 }, stored: true, expired: true },
    {
      name: 'prompt_login and max_age with old stored tokens',
      metadata: { oidc_prompt_login: true, max_age: 60 },
      stored: true,
      expired: true,
    },
  ]) {
    it(`exchanges once without Bearer or refresh despite ${scenario.name}`, async () => {
      const active = installHosted({ ...parent, ...scenario.metadata });
      if (scenario.stored) {
        new Passflow({ url: 'https://auth.example.com', appId, parseQueryParams: false }).setTokens({
          access_token: jwt({ type: 'access', exp: scenario.expired ? 1_000 : 4102444800, auth_time: 1 }),
          refresh_token: jwt({ type: 'refresh' }),
        });
      }
      active.endpoints.set('/auth/refresh', {
        data: { access_token: jwt({ type: 'access' }), refresh_token: jwt({ type: 'refresh' }) },
      });
      active.endpoints.set(exchangePath, { data: { redirect_url: destination } });
      const observed = makeObserved();
      const view = renderLanding({ observed, flow: true });
      await active.releaseSettings();
      await waitFor(() => expect(active.forwards).toEqual([destination]));
      view.rerender(<LandingTree observed={observed} flow />);
      await act(async () => {});
      expectExchanges(active, 1);
      expect(active.forwards).toEqual([destination]);
      expect(assigned).toEqual([destination]);
      expect(submitted).toEqual([]);
      expectNoSignIn();
    });
  }

  for (const status of [400, 401]) {
    it(`renders sign-in after an interactive ${status}`, async () => {
      const held = await mountHeld();
      await releaseFirst(held, { status, data: { error: 'login_required' } });
      await expectSignIn(held.active);
      expectExchanges(held.active, 1);
    });
  }

  for (const mode of deliveryModes) {
    for (const status of [400, 401]) {
      it(`answers login_required via ${mode} for silent ${status} without sign-in`, async () => {
        const held = await mountHeld({ ...parent, oidc_prompt_none: true, response_mode: mode });
        await releaseFirst(held, { status, data: { error: 'login_required' } });
        await expectRpError(held.active, 'login_required', mode);
        expectExchanges(held.active, 1);
      });
    }
  }
});

describe('hosted exchange step-up decisions', () => {
  for (const mode of deliveryModes) {
    for (const constraint of [{ name: 'bare', body: {} }, ...constraints]) {
      it(`answers interaction_required via ${mode} without elevation for silent ${constraint.name} 403`, async () => {
        const held = await mountHeld({ ...parent, oidc_prompt_none: true, response_mode: mode });
        await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', ...constraint.body } });
        await expectRpError(held.active, 'interaction_required', mode);
        expectNoElevation(held.active);
        expectExchanges(held.active, 1);
      });
    }
  }

  it('renders sign-in without elevation for a 403 without constraints', async () => {
    const held = await mountHeld();
    await releaseFirst(held, { status: 403, data: { error: 'upgrade_required' } });
    await expectSignIn(held.active);
    expectNoElevation(held.active);
    expectExchanges(held.active, 1);
  });

  for (const constraint of constraints) {
    it(`translates ${constraint.name}, hides sign-in during elevation and retries once to redirect`, async () => {
      const held = await mountHeld();
      expectNoSignIn();
      await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', ...constraint.body } });
      await expectElevationPending(held);
      // Exercise each wire constraint through the real dialog rather than inspecting facade calls.
      await finishElevation(held, { data: { redirect_url: destination } });
      await waitFor(() => expect(held.active.forwards).toEqual([destination]));
      held.view.rerender(<LandingTree observed={held.observed} flow />);
      await act(async () => {});
      expectExchanges(held.active, 2);
      expect(held.active.forwards).toEqual([destination]);
      expect(assigned).toEqual([destination]);
      expect(submitted).toEqual([]);
      expectNoSignIn();
    });
  }

  it('submits a successful retry form_post once without navigation or sign-in', async () => {
    const held = await mountHeld();
    await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', acr_values: '2' } });
    await expectElevationPending(held);
    const fields = { code: 'retry-code +/&', state };
    await finishElevation(held, { data: { form_post: { action: callback, fields } } });
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submittedFields()).toEqual(fields);
    expect(held.active.forwards).toEqual([]);
    expectExchanges(held.active, 2);
    expectNoSignIn();
  });

  for (const constraint of constraints) {
    it(`renders sign-in after successful ${constraint.name} elevation followed by retry 401`, async () => {
      const held = await mountHeld();
      await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', ...constraint.body } });
      await expectElevationPending(held);
      await finishElevation(held, { status: 401, data: { error: 'login_required' } });
      await waitFor(() => expectExchanges(held.active, 2));
      await dismissSuccessfulElevation();
      await expectSignIn(held.active);
      expectExchanges(held.active, 2);
      expect(screen.queryByTestId('upgrade-dialog')).not.toBeInTheDocument();
    });
  }

  for (const mode of deliveryModes) {
    for (const constraint of constraints) {
      for (const status of [400, 403, 500]) {
        it(`answers unmet_authentication_requirements via ${mode} after ${constraint.name} retry ${status}, without a third exchange`, async () => {
          const held = await mountHeld({ ...parent, response_mode: mode });
          await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', ...constraint.body } });
          await expectElevationPending(held);
          await finishElevation(held, { status, data: { error: 'upgrade_required', ...constraint.body } });
          await expectRpError(held.active, 'unmet_authentication_requirements', mode);
          expectExchanges(held.active, 2);
        });
      }
    }
  }

  for (const mode of deliveryModes) {
    it(`renders sign-in without an RP ${mode} answer or retry when freshness-only elevation rejects`, async () => {
      const held = await mountHeld({ ...parent, response_mode: mode });
      await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', max_age: 60 } });
      await expectElevationPending(held);
      await rejectElevation(held);
      await expectSignIn(held.active);
      expectExchanges(held.active, 1);
      expect(screen.queryByTestId('upgrade-dialog')).not.toBeInTheDocument();
    });
  }

  for (const mode of deliveryModes) {
    for (const constraint of constraints.filter((value) => 'acr_values' in value.body)) {
      it(`answers unmet_authentication_requirements via ${mode} when ${constraint.name} elevation rejects`, async () => {
        const held = await mountHeld({ ...parent, response_mode: mode });
        await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', ...constraint.body } });
        await expectElevationPending(held);
        await rejectElevation(held);
        await expectRpError(held.active, 'unmet_authentication_requirements', mode);
        expectExchanges(held.active, 1);
        expect(screen.queryByTestId('upgrade-dialog')).not.toBeInTheDocument();
      });
    }
  }
});

describe('RP error fallback without a destination', () => {
  for (const mode of deliveryModes) {
    for (const branch of ['silent-400', 'silent-401', 'silent-403', 'cancelled-assurance', 'retry-refused'] as const) {
      it(`renders sign-in without an RP ${mode} answer for ${branch} when redirect_uri is missing`, async () => {
        const silent = branch.startsWith('silent-');
        const held = await mountHeld({ request_id: 'parent-1', state, response_mode: mode, oidc_prompt_none: silent });
        if (branch === 'silent-400' || branch === 'silent-401') {
          await releaseFirst(held, {
            status: branch === 'silent-400' ? 400 : 401,
            data: { error: 'login_required' },
          });
        } else {
          await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', acr_values: '2' } });
          if (!silent) {
            await expectElevationPending(held);
            if (branch === 'cancelled-assurance') await rejectElevation(held);
            else {
              await finishElevation(held, { status: 403, data: { error: 'upgrade_required', acr_values: '2' } });
              await waitFor(() => expectExchanges(held.active, 2));
              await dismissSuccessfulElevation();
            }
          }
        }
        await expectSignIn(held.active);
        expectExchanges(held.active, branch === 'retry-refused' ? 2 : 1);
        expect(screen.queryByTestId('upgrade-dialog')).not.toBeInTheDocument();
        if (silent) expectNoElevation(held.active);
      });
    }
  }

  it('renders sign-in when metadata failed to load and assurance elevation rejects', async () => {
    const held = await mountHeld({}, 404);
    await releaseFirst(held, { status: 403, data: { error: 'upgrade_required', acr_values: '2' } });
    await expectElevationPending(held);
    await rejectElevation(held);
    await expectSignIn(held.active);
    expectExchanges(held.active, 1);
    expect(screen.queryByTestId('upgrade-dialog')).not.toBeInTheDocument();
  });
});
