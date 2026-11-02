// Dev only (not in the package): an app routed by TanStack Router that mounts the
// zero-config flow at /tanstack/auth, for the Playwright check in a real browser.
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  useRouterState,
} from '@tanstack/react-router';
import { PassflowFlow } from '@/components/flow';
import { PassflowProviderWrapper } from './app';

const HostChrome = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav aria-label='host'>
      <output data-testid='host-path'>{pathname}</output>
      <Link to='/tanstack/auth/$' params={{ _splat: 'signup' }}>
        Host link to sign-up
      </Link>
      <Link to='/tanstack/home'>Host home</Link>
    </nav>
  );
};

const rootRoute = createRootRoute({
  component: () => (
    <>
      <HostChrome />
      <Outlet />
    </>
  ),
});
const authIndex = createRoute({ getParentRoute: () => rootRoute, path: '/tanstack/auth', component: () => <PassflowFlow /> });
const authSplat = createRoute({ getParentRoute: () => rootRoute, path: '/tanstack/auth/$', component: () => <PassflowFlow /> });
const home = createRoute({ getParentRoute: () => rootRoute, path: '/tanstack/home', component: () => <h1>Host home page</h1> });

const router = createRouter({ routeTree: rootRoute.addChildren([authIndex, authSplat, home]) });

export const TanStackHostApp = () => (
  <PassflowProviderWrapper>
    <RouterProvider router={router} />
  </PassflowProviderWrapper>
);
