import { describe, expect, it } from 'vitest';
import { AUTH_ENDPOINT_PATTERN } from '../passflow-provider';

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
});
