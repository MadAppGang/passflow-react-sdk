import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appId,
  deferred,
  type HttpReply,
  installLandingEnvironment,
  LandingTree,
  makeObserved,
  type Network,
  renderLanding,
} from './support/federated-harness';

const exchangePath = '/auth/session/exchange';
const callback = 'https://rp.example.com/callback';
const destination = `${callback}?code=redirect-code&state=original`;
const fields = { code: 'code +/&=<>"', state: 'state +/&=<>"' };
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

async function mountHeld() {
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
  active.endpoints.set('/oidc/requests/parent-1', {
    data: { request_id: 'parent-1', redirect_uri: callback, state: fields.state, response_mode: 'form_post' },
  });
  const first = deferred<HttpReply>();
  active.endpoints.set(exchangePath, first.promise);
  vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
    const style = window.getComputedStyle(this);
    submitted.push({
      form: this,
      attached: this.isConnected,
      hidden: this.hidden || style.display === 'none' || style.visibility === 'hidden',
    });
  });
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

function expectNoSignIn() {
  expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/password/i, { selector: 'input' })).not.toBeInTheDocument();
}

function expectPostedAnswer(active: Network) {
  expect(submitted).toHaveLength(1);
  const submission = submitted[0]!;
  expect(submission.attached).toBe(true);
  expect(submission.hidden).toBe(true);
  expect(submission.form.method.toUpperCase()).toBe('POST');
  expect(submission.form.action).toBe(callback);
  const inputs = Array.from(submission.form.querySelectorAll('input'));
  expect(inputs).toHaveLength(2);
  for (const input of inputs) expect(input.type).toBe('hidden');
  expect(Object.fromEntries(inputs.map((input) => [input.name, input.value]))).toEqual(fields);
  expect(active.forwards).toEqual([]);
}

describe('successful hosted exchange answers', () => {
  it('follows redirect_url exactly once without sign-in or POST submission', async () => {
    const held = await mountHeld();
    expectNoSignIn();
    expect(held.active.forwards).toEqual([]);
    await releaseFirst(held, { data: { redirect_url: destination } });
    await waitFor(() => expect(held.active.forwards).toEqual([destination]));
    held.view.rerender(<LandingTree observed={held.observed} flow />);
    await act(async () => {});
    expect(held.active.forwards).toEqual([destination]);
    expect(assigned).toEqual([destination]);
    expect(submitted).toEqual([]);
    expectNoSignIn();
    expect(held.active.requests.filter((request) => request.path === exchangePath)).toHaveLength(1);
  });

  it('submits one hidden attached POST form with exact code and state, without navigation or sign-in', async () => {
    const held = await mountHeld();
    expectNoSignIn();
    expect(submitted).toEqual([]);
    await releaseFirst(held, { data: { form_post: { action: callback, fields } } });
    await waitFor(() => expect(submitted).toHaveLength(1));
    expectPostedAnswer(held.active);
    expectNoSignIn();
    held.view.rerender(<LandingTree observed={held.observed} flow />);
    await act(async () => {});
    expectPostedAnswer(held.active);
    expectNoSignIn();
    expect(held.active.requests.filter((request) => request.path === exchangePath)).toHaveLength(1);
  });
});

describe('fetch sign-in answers under an OIDC parent', () => {
  it('still follows an auth endpoint redirect_url exactly once', async () => {
    const held = await mountHeld();
    await releaseFirst(held, { status: 401, data: { error: 'login_required' } });
    expect(await screen.findByRole('textbox', { name: /email/i })).toBeVisible();
    expect(held.active.forwards).toEqual([]);
    held.active.endpoints.set('/auth/login', { data: { redirect_url: destination } });

    await act(async () => {
      await fetch('https://auth.example.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'hosted@example.com', password: 'test-password', parent_challenge_id: 'parent-1' }),
      });
    });

    await waitFor(() => expect(held.active.forwards).toEqual([destination]));
    expect(assigned).toEqual([destination]);
    expect(submitted).toEqual([]);
    expect(held.active.requests.filter((request) => request.path === '/auth/login')).toHaveLength(1);
  });

  it('executes an auth endpoint form_post from fetch exactly once without location navigation', async () => {
    const held = await mountHeld();
    await releaseFirst(held, { status: 401, data: { error: 'login_required' } });
    expect(await screen.findByRole('textbox', { name: /email/i })).toBeVisible();
    expect(submitted).toEqual([]);
    expect(held.active.forwards).toEqual([]);
    held.active.endpoints.set('/auth/login', { data: { form_post: { action: callback, fields } } });

    await act(async () => {
      await fetch('https://auth.example.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'hosted@example.com', password: 'test-password', parent_challenge_id: 'parent-1' }),
      });
    });

    await waitFor(() => expect(submitted).toHaveLength(1));
    expectPostedAnswer(held.active);
    expect(held.active.requests.filter((request) => request.path === '/auth/login')).toHaveLength(1);
  });
});
