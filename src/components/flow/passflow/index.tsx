import { type FC, type ReactNode, useContext, useEffect, useMemo } from 'react';
import { TwoFactorSetupFlow } from '@/components/flow/two-factor-setup';
import { TwoFactorVerifyFlow } from '@/components/flow/two-factor-verify';
import {
  ForgotPassword,
  ForgotPasswordSuccess,
  InvitationJoin,
  ResetPassword,
  SignIn,
  SignUp,
  VerifyChallengeMagicLink,
  VerifyChallengeOTP,
} from '@/components/form';
import { NavigationContext, routes } from '@/context';
import '@/styles/index.css';
// react-router (v7 or v8) is a required peer dependency, shared with the host app and
// never bundled. It is imported statically, so a missing peer fails at module
// load with the resolver's own error; no runtime guard could run earlier.
import {
  BrowserRouter,
  HashRouter,
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useInRouterContext,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';
import { ErrorComponent } from '@/components/error';
import { withError } from '@/hocs';
import { useNavigation } from '@/hooks';
import type { SuccessAuthRedirect } from '@/types';
import { authRedirectErrorMessage, getUrlErrors } from '@/utils';

export type PassflowProps = {
  successAuthRedirect?: SuccessAuthRedirect;
  federatedDisplayMode?: 'modal' | 'redirect';
  error?: string;
  relyingPartyId?: string;
  pathPrefix?: string;
  /**
   * The router the flow creates for itself. Ignored when the flow is rendered
   * inside a host react-router `<Router>`: the flow then uses the host's router.
   */
  routerType?: 'browser' | 'hash' | 'memory';
  basename?: string;
};

type RouterKind = NonNullable<PassflowProps['routerType']>;

const normalizePathPrefix = (path?: string) => {
  if (!path) return '';
  const pathReplace = path.replace(/^\/+|\/+$/g, '');
  return pathReplace.startsWith('/') ? pathReplace : `/${pathReplace}`;
};

const combineRoutesWithPrefix = (prefix?: string) =>
  Object.keys(routes).reduce(
    (acc, key) => {
      const PATH = key as keyof typeof routes;
      acc[PATH] = `${normalizePathPrefix(prefix)}${routes[key as keyof typeof routes]?.path}`;
      return acc;
    },
    {} as Record<keyof typeof routes, string>,
  );

const RouterProvider: FC<{ children: ReactNode; routerType: RouterKind }> = ({ children, routerType }) => {
  switch (routerType) {
    case 'hash':
      return <HashRouter>{children}</HashRouter>;
    case 'memory':
      return <MemoryRouter>{children}</MemoryRouter>;
    default:
      return <BrowserRouter>{children}</BrowserRouter>;
  }
};

/**
 * Where the flow is mounted inside a host router: the pathname its parent route
 * consumed, without a trailing slash. Under `<Route path='/auth/*'>` at
 * `/auth/signin` this is `/auth`. With no parent route (the flow's own router, or
 * a host router with no `<Routes>` around the flow) it is `''`.
 */
const useParentRouteBase = (): string => {
  const { pathname } = useLocation();
  const splat = useParams()['*'];
  if (splat === undefined) return '';
  const tail = pathname.endsWith(splat) ? splat : encodeURI(splat);
  const base = pathname.endsWith(tail) ? pathname.slice(0, pathname.length - tail.length) : pathname;
  return base.replace(/\/+$/, '');
};

const RouterInnerWrapperProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  // Registered with the provider directly, not through useNavigation's adapter: that
  // adapter shapes calls for the host's own navigate according to the provider's
  // `router` prop, and with the default value it sends every step through
  // window.location, out of this router. The flow always runs inside a React Router (its own or the host's).
  const { setNavigate } = useContext(NavigationContext);

  useEffect(() => {
    setNavigate(({ to, search = '', replace = false }) => {
      // React Router reads `replace` from the options argument only.
      navigate({ pathname: to, search: search && !search.startsWith('?') ? `?${search}` : search }, { replace });
    });
  }, [navigate, setNavigate]);

  return children;
};

type PassflowRoutesProps = Required<Pick<PassflowProps, 'federatedDisplayMode' | 'relyingPartyId' | 'pathPrefix'>> &
  Pick<PassflowProps, 'successAuthRedirect'>;

/**
 * The flow's routes, rendered inside whichever router is in context. Route
 * `path`s are matched against what the parent route left over (the whole
 * pathname when there is no parent route), so they carry only `pathPrefix`.
 * Navigation targets are absolute, so they also carry the parent route's base.
 */
const PassflowRoutes: FC<PassflowRoutesProps> = ({ successAuthRedirect, federatedDisplayMode, relyingPartyId, pathPrefix }) => {
  const parentBase = useParentRouteBase();
  const matchPaths = useMemo(() => combineRoutesWithPrefix(pathPrefix), [pathPrefix]);
  const paths = useMemo(
    () => combineRoutesWithPrefix(`${parentBase}${normalizePathPrefix(pathPrefix)}`),
    [parentBase, pathPrefix],
  );

  // A landing that owes its second factor goes to this flow's own (prefixed)
  // 2FA route; PassflowProvider does the navigation.
  const { setTwoFactorVerifyPath } = useNavigation();
  useEffect(() => {
    setTwoFactorVerifyPath?.(paths.two_factor_verify);
    return () => setTwoFactorVerifyPath?.(null);
  }, [setTwoFactorVerifyPath, paths.two_factor_verify]);

  return (
    <RouterInnerWrapperProvider>
      <Routes>
        <Route
          path={matchPaths.signin}
          element={
            <SignIn
              successAuthRedirect={successAuthRedirect}
              relyingPartyId={relyingPartyId}
              federatedDisplayMode={federatedDisplayMode}
              signUpPath={paths.signup}
              forgotPasswordPath={paths.forgot_password}
              verifyMagicLinkPath={paths.verify_magic_link}
              verifyOTPPath={paths.verify_otp}
              twoFactorVerifyPath={paths.two_factor_verify}
            />
          }
        />
        <Route
          path={matchPaths.signup}
          element={
            <SignUp
              successAuthRedirect={successAuthRedirect}
              relyingPartyId={relyingPartyId}
              federatedDisplayMode={federatedDisplayMode}
              signInPath={paths.signin}
              verifyMagicLinkPath={paths.verify_magic_link}
              verifyOTPPath={paths.verify_otp}
              twoFactorVerifyPath={paths.two_factor_verify}
            />
          }
        />
        <Route
          path={matchPaths.verify_otp}
          element={
            <VerifyChallengeOTP
              successAuthRedirect={successAuthRedirect}
              numInputs={6}
              shouldAutoFocus
              signUpPath={paths.signup}
              twoFactorVerifyPath={paths.two_factor_verify}
            />
          }
        />
        <Route path={matchPaths.verify_magic_link} element={<VerifyChallengeMagicLink />} />
        <Route
          path={matchPaths.forgot_password}
          element={
            <ForgotPassword
              successResetRedirect={successAuthRedirect}
              signInPath={paths.signin}
              forgotPasswordSuccessPath={paths.forgot_password_success}
            />
          }
        />
        <Route path={matchPaths.forgot_password_success} element={<ForgotPasswordSuccess />} />
        <Route
          path={matchPaths.reset_password}
          element={<ResetPassword successAuthRedirect={successAuthRedirect} twoFactorVerifyPath={paths.two_factor_verify} />}
        />
        <Route
          path={matchPaths.invitation}
          element={
            <InvitationJoin successAuthRedirect={successAuthRedirect} signInPath={paths.signin} signUpPath={paths.signup} />
          }
        />
        <Route
          path={matchPaths.two_factor_verify}
          element={
            <TwoFactorVerifyFlow
              successAuthRedirect={successAuthRedirect}
              signInPath={paths.signin}
              twoFactorSetupPath={paths.two_factor_setup}
            />
          }
        />
        <Route
          path={matchPaths.two_factor_setup}
          element={
            <TwoFactorSetupFlow
              successAuthRedirect={successAuthRedirect}
              twoFactorVerifyPath={paths.two_factor_verify}
              signInPath={paths.signin}
            />
          }
        />
        <Route
          path='*'
          element={
            <Navigate
              to={{
                pathname: paths.signin,
                search: window.location.search,
              }}
            />
          }
        />
      </Routes>
    </RouterInnerWrapperProvider>
  );
};

const PassflowWrapper: FC<PassflowProps> = ({
  successAuthRedirect,
  federatedDisplayMode = 'redirect',
  error = undefined,
  relyingPartyId = window.location.hostname,
  pathPrefix = '',
  routerType,
}) => {
  const { error: errorUrlSuccess, message: messageUrlSuccess } = getUrlErrors(successAuthRedirect);

  if (errorUrlSuccess) {
    console.error('[passflow] authentication redirect returned an error', {
      error: errorUrlSuccess,
      message: messageUrlSuccess,
    });
    throw new Error(authRedirectErrorMessage);
  }

  // Inside a host react-router <Router> the flow must not create its own: the
  // router is a shared peer, and a nested <Router> throws. The host's router
  // then owns history, and the flow's routes resolve under its parent route.
  const isInHostRouter = useInRouterContext();
  useEffect(() => {
    if (isInHostRouter && routerType) {
      console.warn(
        `[passflow] PassflowFlow is inside a react-router <Router>, so routerType='${routerType}' is ignored and the host router is used.`,
      );
    }
  }, [isInHostRouter, routerType]);

  if (error) throw new Error(error);

  const flowRoutes = (
    <PassflowRoutes
      successAuthRedirect={successAuthRedirect}
      federatedDisplayMode={federatedDisplayMode}
      relyingPartyId={relyingPartyId}
      pathPrefix={pathPrefix}
    />
  );

  if (isInHostRouter) return flowRoutes;

  return <RouterProvider routerType={routerType ?? 'browser'}>{flowRoutes}</RouterProvider>;
};

export const PassflowFlow = withError(PassflowWrapper, ErrorComponent);
