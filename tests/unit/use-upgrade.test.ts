import { cleanup, renderHook } from '@testing-library/react';
// Coverage map: REQ-5 (FR5), REQ-132 (H8)
import { afterEach, expect, test } from 'vitest';
import { useUpgrade } from '@passflow/react';

afterEach(cleanup);

test('REQ-FR5 H8 outside UpgradeProvider stays idle and actions are harmless', async () => {
  const { result, unmount } = renderHook(() => useUpgrade());
  expect(result.current.status).toBe('idle');
  expect(() => result.current.selectFactor('passkey')).not.toThrow();
  expect(() => result.current.cancel()).not.toThrow();
  await result.current.submit('123456');
  expect(result.current.status).toBe('idle');
  unmount();
});
