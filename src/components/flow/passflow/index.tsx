import { type FC, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { TwoFactorSetupFlow } from '@/components/flow/two-factor-setup';
import { TwoFactorSetupMagicLinkFlow } from '@/components/flow/two-factor-setup-magic-link';
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
import { NavigationContext, SearchContext, type SearchSource } from '@/context';
import '@/styles/index.css';
import { ErrorComponent } from '@/components/error';
import { withError } from '@/hocs';
import { useNavigation } from '@/hooks';
import type { SuccessAuthRedirect } from '@/types';
import { authRedirectErrorMessage, getUrlErrors } from '@/utils';
import {
  createBrowserHistory,
  createHashHistory,
  createMemoryHistory,
  detectPrefix,
  FLOW_SCREENS,
  type FlowHistory,
  type FlowLocation,
  type FlowMatch,
  type FlowNavigate,
  type FlowScreen,
  isUnderPrefix,
  matchScreen,
  normalizePrefix,
  screenPath,
  withQuestionMark,
} from './flow-router';

export type { FlowLocation as PassflowFlowLocation, FlowNavigate as PassflowFlowNavigate } from './flow-router';

type PassflowBaseProps = {
  successAuthRedirect?: SuccessAuthRedirect;
  federatedDisplayMode?: 'modal' | 'redirect';
  error?: string;
  relyingPartyId?: string;
  /**
   * Where the flow is mounted, such as `/auth`: its screens are then `/auth/signin`,
   * `/auth/signup`, and so on. Leave it out and the flow works it out from the first
   * URL it sees (`/auth/signin` or `/auth` → `/auth`; `/` → none).
   */
  pathPrefix?: string;
  /**
   * The history the flow keeps when the app does not pass `location`. `browser`
   * (the default) uses the address bar, on its own or inside the app's router;
   * `hash` keeps the flow's path after `#`; `memory` leaves the URL alone.
   */
  routerType?: 'browser' | 'hash' | 'memory';
  /** @deprecated Never had an effect. Use `pathPrefix`. */
  basename?: string;
};

export type PassflowProps = PassflowBaseProps &
  (
    | {
        location?: undefined;
        navigate?: undefined;
      }
    | {
        /**
         * Full control: the app's router owns the location. Pass its current
         * `{ pathname, search }` and a `navigate` that moves it; `routerType` is then
         * not used. Not needed for an app router in browser mode, which the default
         * already follows.
         */
        location: FlowLocation;
        navigate: FlowNavigate;
      }
  );

type RouterKind = NonNullable<PassflowBaseProps['routerType']>;

const createHistory = (routerType: RouterKind): FlowHistory => {
  if (routerType === 'hash') return createHashHistory();
  if (routerType === 'memory') return createMemoryHistory();
  return createBrowserHistory();
};

/** The location the flow renders and how it moves: its own history, or the app's when it passes both. */
const useFlowLocation = (
  routerType: RouterKind,
  controlledLocation: FlowLocation | undefined,
  controlledNavigate: FlowNavigate | undefined,
): { location: FlowLocation; navigate: FlowNavigate } => {
  const history = useMemo(() => createHistory(routerType), [routerType]);
  const ownLocation = useSyncExternalStore(history.subscribe, history.read);
  if (controlledLocation && controlledNavigate) {
    return {
      location: { pathname: controlledLocation.pathname, search: withQuestionMark(controlledLocation.search ?? '') },
      navigate: controlledNavigate,
    };
  }
  return { location: ownLocation, navigate: history.navigate };
};

type PassflowRoutesProps = Required<Pick<PassflowBaseProps, 'federatedDisplayMode' | 'relyingPartyId'>> &
  Pick<PassflowBaseProps, 'successAuthRedirect' | 'pathPrefix'> & {
    location: FlowLocation;
    navigate: FlowNavigate;
  };

const PassflowRoutes: FC<PassflowRoutesProps> = ({
  successAuthRedirect,
  federatedDisplayMode,
  relyingPartyId,
  pathPrefix,
  location,
  navigate,
}) => {
  // Fixed from the first URL unless the app names it.
  const [detectedPrefix] = useState(() => detectPrefix(location.pathname));
  const prefix = pathPrefix === undefined ? detectedPrefix : normalizePrefix(pathPrefix);

  const paths = useMemo(
    () => Object.fromEntries(FLOW_SCREENS.map((screen) => [screen, screenPath(screen, prefix)])) as Record<FlowScreen, string>,
    [prefix],
  );

  // The forms navigate through the provider. Registered once, reading the latest
  // `navigate` through a ref: an app's inline `navigate` prop changes every render,
  // and re-registering it would re-render the provider and loop.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { setNavigate } = useContext(NavigationContext);
  useEffect(() => {
    setNavigate(({ to, search = '', replace = false }) => {
      const queryAt = to.indexOf('?');
      const pathname = queryAt >= 0 ? to.slice(0, queryAt) : to;
      const query = search || (queryAt >= 0 ? to.slice(queryAt) : '');
      navigateRef.current({ pathname, search: withQuestionMark(query) }, { replace });
    });
  }, [setNavigate]);

  // A landing that owes its second factor goes to this flow's own (prefixed)
  // 2FA route; PassflowProvider does the navigation.
  const { setTwoFactorVerifyPath } = useNavigation();
  useEffect(() => {
    setTwoFactorVerifyPath?.(paths.two_factor_verify);
    return () => setTwoFactorVerifyPath?.(null);
  }, [setTwoFactorVerifyPath, paths.two_factor_verify]);

  const match = matchScreen(location.pathname, prefix);
  // A path inside the flow that names no screen goes to sign-in, keeping its search
  // params. A path outside the flow belongs to the app: the flow renders nothing.
  const strayInsideFlow = !match && isUnderPrefix(location.pathname, prefix);
  useEffect(() => {
    if (strayInsideFlow) navigateRef.current({ pathname: paths.signin, search: location.search }, { replace: true });
  }, [strayInsideFlow, paths.signin, location.search]);

  // The forms read and write search params through the flow's location, not the
  // address bar, so memory, hash and app-driven flows carry them too. A write can
  // happen while a form renders (default params), so it moves after the render.
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;
  const searchSource = useMemo<SearchSource>(
    () => ({
      read: () => location.search,
      write: (search, { replace }) =>
        queueMicrotask(() => navigateRef.current({ pathname: pathnameRef.current, search }, { replace })),
    }),
    [location.search],
  );

  if (!match) return null;

  return (
    <SearchContext.Provider value={searchSource}>
      <FlowScreenView
        match={match}
        paths={paths}
        successAuthRedirect={successAuthRedirect}
        federatedDisplayMode={federatedDisplayMode}
        relyingPartyId={relyingPartyId}
      />
    </SearchContext.Provider>
  );
};

type FlowScreenViewProps = Pick<PassflowRoutesProps, 'successAuthRedirect' | 'federatedDisplayMode' | 'relyingPartyId'> & {
  match: FlowMatch;
  paths: Record<FlowScreen, string>;
};

/** The screen a matched path names, wired to the flow's other screens. */
const FlowScreenView: FC<FlowScreenViewProps> = ({
  match,
  paths,
  successAuthRedirect,
  federatedDisplayMode,
  relyingPartyId,
}) => {
  switch (match.screen) {
    case 'signin':
      return (
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
      );
    case 'signup':
      return (
        <SignUp
          successAuthRedirect={successAuthRedirect}
          relyingPartyId={relyingPartyId}
          federatedDisplayMode={federatedDisplayMode}
          signInPath={paths.signin}
          verifyMagicLinkPath={paths.verify_magic_link}
          verifyOTPPath={paths.verify_otp}
          twoFactorVerifyPath={paths.two_factor_verify}
        />
      );
    case 'verify_otp':
      return (
        <VerifyChallengeOTP
          successAuthRedirect={successAuthRedirect}
          numInputs={6}
          shouldAutoFocus
          signUpPath={paths.signup}
          twoFactorVerifyPath={paths.two_factor_verify}
        />
      );
    case 'verify_magic_link':
      return <VerifyChallengeMagicLink />;
    case 'forgot_password':
      return (
        <ForgotPassword
          successResetRedirect={successAuthRedirect}
          signInPath={paths.signin}
          forgotPasswordSuccessPath={paths.forgot_password_success}
        />
      );
    case 'forgot_password_success':
      return <ForgotPasswordSuccess />;
    case 'reset_password':
      return <ResetPassword successAuthRedirect={successAuthRedirect} twoFactorVerifyPath={paths.two_factor_verify} />;
    case 'invitation':
      return <InvitationJoin successAuthRedirect={successAuthRedirect} signInPath={paths.signin} signUpPath={paths.signup} />;
    case 'two_factor_verify':
      return (
        <TwoFactorVerifyFlow
          successAuthRedirect={successAuthRedirect}
          signInPath={paths.signin}
          twoFactorSetupPath={paths.two_factor_setup}
        />
      );
    case 'two_factor_setup':
      return (
        <TwoFactorSetupFlow
          successAuthRedirect={successAuthRedirect}
          twoFactorVerifyPath={paths.two_factor_verify}
          signInPath={paths.signin}
        />
      );
    case 'two_factor_setup_magic_link':
      return <TwoFactorSetupMagicLinkFlow token={match.params.token ?? ''} signInPath={paths.signin} />;
  }
};

const PassflowWrapper: FC<PassflowProps> = ({
  successAuthRedirect,
  federatedDisplayMode = 'redirect',
  error = undefined,
  relyingPartyId = window.location.hostname,
  pathPrefix,
  routerType = 'browser',
  location: controlledLocation,
  navigate: controlledNavigate,
}) => {
  const { error: errorUrlSuccess, message: messageUrlSuccess } = getUrlErrors(successAuthRedirect);
  const { location, navigate } = useFlowLocation(routerType, controlledLocation, controlledNavigate);

  if (errorUrlSuccess) {
    console.error('[passflow] authentication redirect returned an error', {
      error: errorUrlSuccess,
      message: messageUrlSuccess,
    });
    throw new Error(authRedirectErrorMessage);
  }

  if (error) throw new Error(error);

  return (
    <PassflowRoutes
      successAuthRedirect={successAuthRedirect}
      federatedDisplayMode={federatedDisplayMode}
      relyingPartyId={relyingPartyId}
      pathPrefix={pathPrefix}
      location={location}
      navigate={navigate}
    />
  );
};

export const PassflowFlow = withError(PassflowWrapper, ErrorComponent);
