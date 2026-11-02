import { PassflowFlow, PassflowProvider, useNavigation } from '@passflow/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  BrowserRouter,
  Route as RrRoute,
  Routes as RrRoutes,
  useLocation as useRrLocation,
  useNavigate as useRrNavigate,
} from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useLocation as useWouterLocation, Route as WouterRoute, Router as WouterRouter, Switch as WouterSwitch } from 'wouter';
import { providerConfig, stubBrowserApis } from './support/passflow-fixtures';

// The zero-config flow, `<PassflowFlow />` with no router props, mounted on a catch-all
// route inside a real app router in browser mode. The flow and the app's router must
// agree on the URL whichever of them moves, and Back must reach both.

beforeEach(() => {
  stubBrowserApis();
  window.history.replaceState(null, '', '/auth');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** What the app's router believes the path is, and how the app moves. */
type HostHooks = { useHostPath: () => string; useHostNavigate: () => (to: string) => void };

/** Drives the provider's navigate, as the forms do. */
const FlowButton = () => {
  const { navigate } = useNavigation();
  return (
    <button type='button' onClick={() => navigate({ to: '/auth/forgot-password', search: 'default_method=email_or_username' })}>
      flow moves
    </button>
  );
};

const makeHostChrome = ({ useHostPath, useHostNavigate }: HostHooks) => {
  const HostChrome = () => {
    const path = useHostPath();
    const navigate = useHostNavigate();
    return (
      <>
        <output data-testid='host-path'>{path}</output>
        <button type='button' onClick={() => navigate('/auth/signup')}>
          app moves
        </button>
        <button type='button' onClick={() => navigate('/dashboard')}>
          app leaves
        </button>
        <FlowButton />
      </>
    );
  };
  return HostChrome;
};

const signInHeading = () => screen.queryByRole('heading', { name: /sign in/i });
const hostPath = () => screen.getByTestId('host-path').textContent;

type Host = { name: string; renderApp: () => void };

const ReactRouterApp = () => {
  const Chrome = makeHostChrome({
    useHostPath: () => useRrLocation().pathname,
    useHostNavigate: () => {
      const navigate = useRrNavigate();
      return (to) => navigate(to);
    },
  });
  return (
    <BrowserRouter>
      <RrRoutes>
        <RrRoute path='/auth/*' element={<PassflowFlow />} />
        <RrRoute path='/dashboard' element={<p>dashboard</p>} />
      </RrRoutes>
      <Chrome />
    </BrowserRouter>
  );
};

const WouterApp = () => {
  const Chrome = makeHostChrome({
    useHostPath: () => useWouterLocation()[0],
    useHostNavigate: () => useWouterLocation()[1],
  });
  return (
    <WouterRouter>
      <WouterSwitch>
        <WouterRoute path='/auth' nest>
          <PassflowFlow />
        </WouterRoute>
        <WouterRoute path='/dashboard'>
          <p>dashboard</p>
        </WouterRoute>
      </WouterSwitch>
      <Chrome />
    </WouterRouter>
  );
};

const makeTanStackRouter = () => {
  const Chrome = makeHostChrome({
    useHostPath: () => useRouterState({ select: (state) => state.location.pathname }),
    useHostNavigate: () => {
      const router = useRouter();
      return (to) => void router.navigate({ to });
    },
  });
  const Layout = (): ReactNode => (
    <>
      <Outlet />
      <Chrome />
    </>
  );
  const rootRoute = createRootRoute({ component: Layout });
  const authIndex = createRoute({ getParentRoute: () => rootRoute, path: '/auth', component: () => <PassflowFlow /> });
  const authSplat = createRoute({ getParentRoute: () => rootRoute, path: '/auth/$', component: () => <PassflowFlow /> });
  const dashboard = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: () => <p>dashboard</p> });
  return createRouter({ routeTree: rootRoute.addChildren([authIndex, authSplat, dashboard]) });
};

const hosts: Host[] = [
  {
    name: 'React Router',
    renderApp: () =>
      render(
        <PassflowProvider {...providerConfig}>
          <ReactRouterApp />
        </PassflowProvider>,
      ),
  },
  {
    name: 'TanStack Router',
    renderApp: () =>
      render(
        <PassflowProvider {...providerConfig}>
          <RouterProvider router={makeTanStackRouter()} />
        </PassflowProvider>,
      ),
  },
  {
    name: 'Wouter',
    renderApp: () =>
      render(
        <PassflowProvider {...providerConfig}>
          <WouterApp />
        </PassflowProvider>,
      ),
  },
];

describe.each(hosts)('zero-config PassflowFlow inside $name', ({ renderApp }) => {
  test('the bare mount path lands on sign-in; the app router sees it', async () => {
    renderApp();
    await waitFor(() => expect(signInHeading()).not.toBeNull());
    expect(window.location.pathname).toBe('/auth/signin');
    await waitFor(() => expect(hostPath()).toBe('/auth/signin'));
  });

  test('the flow moves and the app router follows', async () => {
    renderApp();
    await waitFor(() => expect(signInHeading()).not.toBeNull());
    await act(async () => screen.getByRole('button', { name: 'flow moves' }).click());
    await waitFor(() => expect(hostPath()).toBe('/auth/forgot-password'));
    expect(window.location.pathname).toBe('/auth/forgot-password');
    expect(signInHeading()).toBeNull();
  });

  test('the app moves and the flow follows; Back reaches both', async () => {
    renderApp();
    await waitFor(() => expect(signInHeading()).not.toBeNull());
    await act(async () => screen.getByRole('button', { name: 'app moves' }).click());
    await waitFor(() => expect(window.location.pathname).toBe('/auth/signup'));
    await waitFor(() => expect(signInHeading()).toBeNull());
    await act(async () => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe('/auth/signin'));
    await waitFor(() => expect(hostPath()).toBe('/auth/signin'));
    await waitFor(() => expect(signInHeading()).not.toBeNull());
  });

  test('leaving the flow stays left: no bounce back to sign-in', async () => {
    renderApp();
    await waitFor(() => expect(signInHeading()).not.toBeNull());
    await act(async () => screen.getByRole('button', { name: 'app leaves' }).click());
    await screen.findByText('dashboard');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(window.location.pathname).toBe('/dashboard');
    expect(hostPath()).toBe('/dashboard');
  });
});

// The README's full-control example, as written: a TanStack Router app on a memory
// history (the address bar never moves) hands the flow its location and navigate.
describe('full control: PassflowFlow driven by a TanStack Router memory history', () => {
  const AuthPage = () => {
    const router = useRouter();
    const location = useRouterState({ select: (state) => state.location });
    return (
      <PassflowFlow
        location={{ pathname: location.pathname, search: location.searchStr }}
        navigate={(to, { replace }) => {
          const href = `${to.pathname}${to.search}`;
          if (replace) router.history.replace(href);
          else router.history.push(href);
        }}
      />
    );
  };

  const makeRouter = () => {
    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <FlowButton />
          <output data-testid='host-path'>{useRouterState({ select: (state) => state.location.href })}</output>
        </>
      ),
    });
    const authIndex = createRoute({ getParentRoute: () => rootRoute, path: '/auth', component: AuthPage });
    const authSplat = createRoute({ getParentRoute: () => rootRoute, path: '/auth/$', component: AuthPage });
    return createRouter({
      routeTree: rootRoute.addChildren([authIndex, authSplat]),
      history: createMemoryHistory({ initialEntries: ['/auth'] }),
    });
  };

  test('lands on sign-in and moves with search params, the address bar untouched', async () => {
    window.history.replaceState(null, '', '/page-with-a-widget');
    const router = makeRouter();
    render(
      <PassflowProvider {...providerConfig}>
        <RouterProvider router={router} />
      </PassflowProvider>,
    );
    await waitFor(() => expect(signInHeading()).not.toBeNull());
    await waitFor(() => expect(hostPath()).toBe('/auth/signin'));
    await act(async () => screen.getByRole('button', { name: 'flow moves' }).click());
    await waitFor(() => expect(hostPath()).toBe('/auth/forgot-password?default_method=email_or_username'));
    expect(signInHeading()).toBeNull();
    await act(async () => router.history.back());
    await waitFor(() => expect(signInHeading()).not.toBeNull());
    expect(window.location.pathname).toBe('/page-with-a-widget');
  });
});
