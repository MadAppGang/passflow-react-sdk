import { describe, expect, it } from 'vitest';
import { signInSearch } from '@/utils/second-factor';

// TEST-U2 REQ-6 REQ-16 / architecture §3: compare query semantics, not serialization order.
const dropped = ['challenge_id', 'expires_at', 'match_code', 'otp', 'flow', 'token', 'redirect_url'];
const kept: Array<[string, string]> = [
  ['appid', 'lower-app'],
  ['appId', 'camel-app'],
  ['parent_challenge_id', 'parent-row'],
  ['redirectto', 'https://client.example/return?a=1&b=two words'],
  ['invite_token', 'invitation'],
  ['email', 'first+last@example.com'],
  ['phone', '+351 123456789'],
  ['scopes', 'openid email'],
  ['challenge_type', 'totp'],
  ['create_tenant', 'true'],
  ['type', 'login'],
  ['unrelated', 'keep/me'],
];

describe('TEST-U2 REQ-6 REQ-16 signInSearch', () => {
  it.each(dropped)('removes every repeated %s without dropping sign-in context', (key) => {
    const source = new URLSearchParams(kept);
    source.append(key, 'secret-one');
    source.append(key, 'secret-two');
    const actual = new URLSearchParams(signInSearch('?' + source.toString()));
    expect(actual.has(key)).toBe(false);
    expect([...actual.entries()]).toEqual(kept);
  });

  it('retains both app spellings and every explicitly retained and unknown value', () => {
    const actual = new URLSearchParams(signInSearch('?' + new URLSearchParams(kept)));
    expect([...actual.entries()]).toEqual(kept);
  });

  it('preserves repeated retained values, empty values and encoded destination semantics', () => {
    const expected: Array<[string, string]> = [
      ['scopes', 'openid email'],
      ['scopes', 'tenant:read'],
      ['email', 'a+b@example.com'],
      ['empty', ''],
      ['redirectto', 'https://client.example/a%2Fb?q=a+b#fragment'],
    ];
    const source = new URLSearchParams(expected);
    for (const key of dropped) source.append(key, 'discard');
    expect([...new URLSearchParams(signInSearch('?' + source)).entries()]).toEqual(expected);
  });

  it.each(['', '?'])('does not add parameters to an empty search (%j)', (source) => {
    expect([...new URLSearchParams(signInSearch(source)).entries()]).toEqual([]);
  });

  it('is semantically idempotent on an already sanitized sign-in search', () => {
    const source = '?' + new URLSearchParams([...kept, ['token', 'do-not-forward']]);
    const once = signInSearch(source);
    const twice = signInSearch(once);
    expect([...new URLSearchParams(twice).entries()]).toEqual(kept);
  });
});
