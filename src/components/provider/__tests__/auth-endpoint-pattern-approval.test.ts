import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ENDPOINT_PATTERN, PASSWORDLESS_STATUS_PATTERN } from '../passflow-provider';
import { appId, installLandingEnvironment, makeObserved, type Network, renderLanding } from './support/federated-harness';

// Additive sibling: do not rewrite existing endpoint coverage.
describe('REQ-10 parent-injection public endpoint pattern', () => {
  it.each(['/auth/passwordless/start', '/auth/passwordless/complete'])('includes %s', (path) => {
    expect(AUTH_ENDPOINT_PATTERN.test('https://auth.example.com' + path)).toBe(true);
  });
  it.each(['/auth/passwordless/status', '/auth/passwordless/approval/info', '/auth/passwordless/approval/decide'])(
    'excludes %s so approval and polling cannot inherit an unrelated parent',
    (path) => {
      expect(AUTH_ENDPOINT_PATTERN.test('https://auth.example.com' + path)).toBe(false);
    },
  );
  it('names only the status poll as follow-only', () => {
    expect(PASSWORDLESS_STATUS_PATTERN.test('https://auth.example.com/auth/passwordless/status')).toBe(true);
    expect(PASSWORDLESS_STATUS_PATTERN.test('https://auth.example.com/auth/passwordless/approval/decide')).toBe(false);
  });
});

const STATUS_URL = 'https://auth.example.com/auth/passwordless/status';
const RP_URL = 'https://rp.example.com/callback?code=abc';
const POLL_BODY = JSON.stringify({ challenge_id: 'row-1' });

// The browser's XHR boundary: records what was sent and answers with a fixed JSON body.
const sentBodies: unknown[] = [];
class FakeXMLHttpRequest extends EventTarget {
  status = 0;
  responseText = '';
  open(_method: string, _url: string | URL) {}
  setRequestHeader() {}
  send(body?: unknown) {
    sentBodies.push(body);
    this.status = 200;
    this.responseText = JSON.stringify({ redirect_url: RP_URL });
    queueMicrotask(() => this.dispatchEvent(new Event('load')));
  }
}

let network: Network | undefined;
afterEach(() => {
  network?.restore();
  network = undefined;
  sentBodies.length = 0;
});

const mountUnderParent = () => {
  network = installLandingEnvironment({ pathname: '/web/signin', search: `?appid=${appId}&parent_challenge_id=parent-1` });
  network.endpoints.set('/oidc/requests/parent-1', { data: {}, status: 404 });
  network.endpoints.set('/auth/passwordless/status', { data: { redirect_url: RP_URL } });
  vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
  renderLanding({ observed: makeObserved(), flow: false });
  return network;
};

describe('status poll under a parent', () => {
  it('follows redirect_url in an XHR status answer once and leaves the poll body as sent', async () => {
    const { forwards } = mountUnderParent();

    await act(async () => {
      const request = new XMLHttpRequest();
      request.open('POST', STATUS_URL);
      request.send(POLL_BODY);
    });

    await waitFor(() => expect(forwards).toEqual([RP_URL]));
    expect(sentBodies).toEqual([POLL_BODY]);
  });

  it('follows redirect_url in a fetch status answer once and leaves the poll body as sent', async () => {
    const { forwards, requests } = mountUnderParent();

    await act(async () => {
      await window.fetch(STATUS_URL, { method: 'POST', body: POLL_BODY });
    });

    await waitFor(() => expect(forwards).toEqual([RP_URL]));
    const polls = requests.filter((request) => request.path === '/auth/passwordless/status');
    expect(polls.map((request) => request.body)).toEqual([{ challenge_id: 'row-1' }]);
  });
});
