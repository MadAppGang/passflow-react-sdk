import { PassflowFlow, PassflowProvider, useNavigation } from '@passflow/react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { providerConfig, stubBrowserApis } from './support/passflow-fixtures';

// A navigation asked for with `replace: true` replaces the history entry; without it
// one is pushed. The provider's `router` prop describes the app's own navigate for
// the standalone forms and must not change how PassflowFlow moves.

beforeEach(() => {
  stubBrowserApis();
  window.history.replaceState(null, '', '/auth/signin');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Drives the provider's navigate, as the forms do.
const NavigateButtons = () => {
  const { navigate } = useNavigation();
  return (
    <>
      <button type='button' onClick={() => navigate({ to: '/auth/signup', search: 'a=1', replace: true })}>
        replace
      </button>
      <button type='button' onClick={() => navigate({ to: '/auth/signup', search: 'a=1' })}>
        push
      </button>
    </>
  );
};

describe.each([
  ['react-router', 'react-router'],
  ['default (no prop)', undefined],
] as const)('provider router %s', (_label, router) => {
  describe('PassflowFlow with its own browser history', () => {
    const renderFlow = () =>
      render(
        <PassflowProvider {...providerConfig} router={router}>
          <PassflowFlow />
          <NavigateButtons />
        </PassflowProvider>,
      );

    test('replace: true moves the URL without a new history entry', async () => {
      renderFlow();
      await screen.findByRole('heading', { name: /sign in/i });
      const before = window.history.length;
      await act(async () => screen.getByRole('button', { name: 'replace' }).click());
      await waitFor(() => expect(screen.queryByRole('heading', { name: /sign in/i })).toBeNull());
      expect(`${window.location.pathname}${window.location.search}`).toBe('/auth/signup?a=1');
      expect(window.history.length).toBe(before);
    });

    test('without replace the navigation adds a history entry', async () => {
      renderFlow();
      await screen.findByRole('heading', { name: /sign in/i });
      const before = window.history.length;
      await act(async () => screen.getByRole('button', { name: 'push' }).click());
      await waitFor(() => expect(screen.queryByRole('heading', { name: /sign in/i })).toBeNull());
      expect(`${window.location.pathname}${window.location.search}`).toBe('/auth/signup?a=1');
      expect(window.history.length).toBe(before + 1);
    });
  });

  describe('PassflowFlow driven by the app router (location + navigate props)', () => {
    // A memory-mode app router does not follow the address bar, so it hands the flow
    // its location and navigate.
    const ControlledFlow = () => {
      const location = useLocation();
      const navigate = useNavigate();
      return (
        <PassflowFlow
          location={location}
          navigate={({ pathname, search }, { replace }) => navigate({ pathname, search }, { replace })}
        />
      );
    };
    const Where = () => {
      const location = useLocation();
      const navigationType = useNavigationType();
      return <output data-testid='where'>{`${location.pathname}${location.search} ${navigationType}`}</output>;
    };
    const renderControlled = () =>
      render(
        <PassflowProvider {...providerConfig} router={router}>
          <MemoryRouter initialEntries={['/auth/signin']}>
            <Routes>
              <Route path='/auth/*' element={<ControlledFlow />} />
            </Routes>
            <Where />
            <NavigateButtons />
          </MemoryRouter>
        </PassflowProvider>,
      );

    test('replace: true reaches the app router as a replace', async () => {
      renderControlled();
      await screen.findByRole('heading', { name: /sign in/i });
      await act(async () => screen.getByRole('button', { name: 'replace' }).click());
      await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/auth/signup?a=1 REPLACE'));
      await waitFor(() => expect(screen.queryByRole('heading', { name: /sign in/i })).toBeNull());
    });

    test('without replace the app router pushes', async () => {
      renderControlled();
      await screen.findByRole('heading', { name: /sign in/i });
      await act(async () => screen.getByRole('button', { name: 'push' }).click());
      await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/auth/signup?a=1 PUSH'));
    });
  });
});
