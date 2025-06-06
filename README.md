# @passflow/passflow-react-sdk

This is a SDK for react application.

## Table of Contents

- [@passflow/passflow-react-sdk](#passflowpassflow-react-sdk)
  - [Table of Contents](#table-of-contents)
  - [Local Development](#local-development)
    - [Using Local Passflow JS SDK](#using-local-passflow-js-sdk)
  - [Test writing Environment Setup](#test-writing-environment-setup)
  - [UI Testing](#ui-testing)
    - [Writing your own ui tests.](#writing-your-own-ui-tests)
  - [Installation](#installation)
  - [Requirements](#requirements)
  - [Integration](#integration)
    - [Passflow Cloud](#passflow-cloud)
    - [PassflowFlow](#passflowflow)
    - [React Router DOM](#react-router-dom)
    - [Wouter](#wouter)
    - [TanStack Router](#tanstack-router)
  - [Props](#props)
    - [PassflowProvider](#passflowprovider)
  - [Form Components](#form-components)
    - [SignIn](#signin)
    - [SignUp](#signup)
    - [ForgotPassword](#forgotpassword)
    - [ForgotPasswordSuccess](#forgotpasswordsuccess)
    - [ResetPassword](#resetpassword)
    - [VerifyChallengeMagicLink](#verifychallengemagiclink)
    - [VerifyChallengeOTP](#verifychallengeotp)
    - [InvitationJoin](#invitationjoin)
  - [Hooks](#hooks)
    - [useAuth](#useauth)
    - [usePassflow](#usepassflow)
    - [usePassflowStore](#usepassflowstore)
    - [useSignIn](#usesignin)
    - [useSignUp](#usesignup)
    - [useNavigation](#usenavigation)
    - [useProvider](#useprovider)
    - [useResetPassword](#useresetpassword)
    - [useUserPasskeys](#useuserpasskeys)
    - [useAppSettings](#useappsettings)
    - [useAuthCloudRedirect](#useauthcloudredirect)
    - [useForgotPassword](#useforgotpassword)
    - [useJoinInvite](#usejoininvite)
    - [useLogout](#uselogout)
    - [usePasswordlessComplete](#usepasswordlesscomplete)

to install just type:

```
pnpm install
pnpm build
```

## Local Development

### Using Local Passflow JS SDK

For local development and testing with a local version of the Passflow JS SDK, you need to:

1. Clone the Passflow JS SDK repository in a sibling directory to this project.
2. remove current dependecy `pnpm remove @passflow/passflow-js-sdk`
3. Link folder with:

```sh
pnpm link ../passflow-js-sdk
pnpm install
```

Now you can  run watch mode in libraray mode and change it. It will compile every changes incrementally.

```sh
pnpm watch
```

After all done, we need to unlink and return all to the original state

```sh
pnpm remove @passflow/passflow-js-sdk
pnpm unlink @passflow/passflow-js-sdk
pnpm install @passflow/passflow-js-sdk
```

## Test writing Environment Setup

For local development and UI testing, you need to set up the Passflow environment:

1. Set the `PASSFLOW_URL` environment variable to point to your Passflow instance.
1. Set the `PASSFLOW_APP_ID` environment variable
1. Run `pnpm dev` anmd all should works

Refer `.env.example` for more details.


we are using pnpm. Please ansure you have it in the system.

## UI Testing

We are using playwright to run UI tests.

First, ensure you have all runtime binary enabled:

```
pnpm exec playwright install
```

and then feel free to run the tests:

```
pnpm run test:ui
```

### Writing your own ui tests.

You can find a tests in the `./tests` frolder.

Please create the new files using the current tests as a reference.

To run the playwright in the design mode with ui, run the follwoing command:

```
pnpm playwright test --ui
```

## Installation

```bash
pnpm add @passflow/passflow-react-sdk
```

## Requirements

- React 18+
- React Router DOM v6/v7 or Wouter or TanStack Router

## Integration

### Passflow Cloud

For a quick start with Passflow Cloud:

```tsx
const passflowConfig: PassflowConfig = {
  url: process.env.PASSFLOW_URL ?? 'http://localhost:5432',
  appId: process.env.PASSFLOW_APP_ID ?? 'test_app_id',
  createTenantForNewUser: true,
  scopes: ['openid', 'email', 'profile', 'offline'],
};

export const PassflowProviderWrapper: FC<PropsWithChildren> = ({
  children,
}) => {
  const navigate = useNavigate(); // from react-router-dom

  return (
    <PassflowProvider
      url={passflowConfig.url}
      appId={passflowConfig.appId}
      createTenantForNewUser={passflowConfig.createTenantForNewUser}
      scopes={passflowConfig.scopes}
      navigate={(options) =>
        navigate(
          {
            pathname: options.to,
            search: options.search,
          },
          { replace: options.replace }
        )
      }
      router="react-router"
    >
      {children}
    </PassflowProvider>
  );
};

export const App = () => (
  <BrowserRouter>
    <PassflowProviderWrapper>
      <PassflowFlow
        federatedDisplayMode='redirect'
        successAuthRedirect='https://jwt.io'
        pathPrefix='/web'
      />
    </PassflowProviderWrapper>
  </BrowserRouter>
);
```
### PassflowFlow

| Prop | Type | Description |
|------|------|-------------|
| successAuthRedirect | string | URL to redirect after successful authentication |
| federatedDisplayMode | "popup" \| "redirect" | Federated authentication display mode |
| pathPrefix | string | Prefix for all routes (optional) |

### React Router DOM

Example of integration with React Router DOM:
PS: The example uses the Declarative approach.

```tsx
import {
  PassflowProvider,
  SignIn,
  SignUp,
  ForgotPassword,
  ForgotPasswordSuccess,
} from "@passflow/passflow-react-sdk";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

const passflowConfig = {
  url: import.meta.env.VITE_PASSFLOW_URL,
  appId: import.meta.env.VITE_PASSFLOW_APP_ID,
  createTenantForNewUser: true,
  scopes: ["id", "offline", "email", "profile", "openid", "management"],
};

const PassflowProviderWrapper = ({ children }) => {
  const navigate = useNavigate();

  return (
    <PassflowProvider
      url={passflowConfig.url}
      appId={passflowConfig.appId}
      createTenantForNewUser={passflowConfig.createTenantForNewUser}
      scopes={passflowConfig.scopes}
      navigate={(options) =>
        navigate(
          {
            pathname: options.to,
            search: options.search,
          },
          { replace: options.replace }
        )
      }
      router="react-router"
    >
      {children}
    </PassflowProvider>
  );
};

export const App = () => (
  <BrowserRouter>
    <PassflowProviderWrapper>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn successAuthRedirect="/" signUpPath="/signup" />} />
        <Route path="/signup" element={<SignUp successAuthRedirect="/" signInPath="/signin" />} />
        <Route 
          path="/forgot-password" 
          element={
            <ForgotPassword
              successResetRedirect="/"
              signInPath="/signin"
              forgotPasswordSuccessPath="/forgot-password/success"
            />
          } 
        />
        <Route path="/forgot-password/success" element={<ForgotPasswordSuccess />} />
        {/* Add other routes here */}
      </Routes>
    </PassflowProviderWrapper>
  </BrowserRouter>
);
```

### Wouter

Example of integration with Wouter:

```tsx
import {
  PassflowProvider,
  SignIn,
  SignUp,
  ForgotPassword,
  ForgotPasswordSuccess,
} from "@passflow/passflow-react-sdk";
import { Switch, Route, useLocation } from "wouter";

const passflowConfig = {
  url: import.meta.env.VITE_PASSFLOW_URL,
  appId: import.meta.env.VITE_PASSFLOW_APP_ID,
  createTenantForNewUser: true,
  scopes: ["id", "offline", "email", "profile", "openid", "management"],
};

const PassflowProviderWrapper = ({ children }) => {
  const [, navigate] = useLocation();

  return (
    <PassflowProvider
      url={passflowConfig.url}
      appId={passflowConfig.appId}
      createTenantForNewUser={passflowConfig.createTenantForNewUser}
      scopes={passflowConfig.scopes}
      navigate={(options) => {
        const searchParamWouter = options.search
          ? options.search.startsWith("?")
            ? options.search
            : `?${options.search}`
          : "";
        navigate(`${options.to}${searchParamWouter}`, {
          replace: options.replace,
        });
      }}
      router="wouter"
    >
      {children}
    </PassflowProvider>
  );
};

export const App = () => (
  <Switch>
    <PassflowProviderWrapper>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignInWrapper} />
      <Route path="/signup" component={SignUpWrapper} />
      <Route path="/forgot-password" component={ForgotPasswordWrapper} />
      <Route path="/forgot-password/success" component={ForgotPasswordSuccessWrapper} />
      {/* Add other routes here */}
    </PassflowProviderWrapper>
  </Switch>
);
```

### TanStack Router

Example of integration with TanStack Router:
PS: The example uses Code-Based Routing.

```tsx
// App.tsx
import { PassflowProviderWrapper, RouterProvider } from './providers';

export const App = () => (
  <PassflowProviderWrapper>
    <RouterProvider />
  </PassflowProviderWrapper>
);

// PassflowProviderWrapper.tsx
import { PassflowProvider } from '@passflow/passflow-react-sdk';

const passflowConfig = {
  url: import.meta.env.VITE_PASSFLOW_URL,
  appId: import.meta.env.VITE_PASSFLOW_APP_ID,
  createTenantForNewUser: true,
  scopes: ['id', 'offline', 'email', 'profile', 'openid', 'management'],
};

export const PassflowProviderWrapper = ({ children }) => (
  <PassflowProvider
    url={passflowConfig.url}
    appId={passflowConfig.appId}
    createTenantForNewUser={passflowConfig.createTenantForNewUser}
    scopes={passflowConfig.scopes}
    router="tanstack-router"
  >
    {children}
  </PassflowProvider>
);

// router/root.tsx
import { useNavigation } from '@passflow/passflow-react-sdk';
import { Outlet, useNavigate } from '@tanstack/react-router';

export const Root = () => {
  const navigate = useNavigate();
  const { setNavigate } = useNavigation();

  useEffect(() => {
    setNavigate((options) => navigate(options));
  }, [navigate, setNavigate]);

  return <Outlet />;
};

// router.tsx
import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { queryClient } from '../query';
import { routerTree } from './routes';
import { Passflow } from '@passflow/passflow-react-sdk';

export interface RouterContext {
  queryClient: QueryClient;
  passflow?: Passflow;
}

export const router = createRouter({
  routeTree: routerTree,
  context: {
    queryClient,
    passflow: undefined,
  },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}


// routes.tsx
import { Outlet, createRootRouteWithContext, createRoute, redirect } from '@tanstack/react-router';
import { RouterContext } from './router';
import { Root } from './root';
import { About, Home } from '@/pages';
import { ForgotPassword, ForgotPasswordSuccess, SignIn, SignUp } from '@passflow/passflow-react-sdk';
import { RootLayout } from '@/layouts';

const redirectToSignin = () => {
  throw redirect({
    to: '/signin',
  });
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Root,
  notFoundComponent: () => <div>404 Not Found</div>,
});

// PUBLIC ROUTES
const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public',
  component: () => <Outlet />,
});

const signInRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/signin',
  component: () => <SignIn successAuthRedirect='/' signUpPath='/signup' />,
});

const signUpRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/signup',
  component: () => <SignUp successAuthRedirect='/' signInPath='/signin' />,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/forgot-password',
  component: () => (
    <ForgotPassword successResetRedirect='/' signInPath='/signin' forgotPasswordSuccessPath='/forgot-password/success' />
  ),
});

const forgotPasswordSuccessRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/forgot-password/success',
  component: () => <ForgotPasswordSuccess />,
});

{/* Add other PASSFLOW COMPONENTS routes here */}

// PROTECTED ROUTES
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: async ({ context }) => {
    const { passflow } = context;

    await passflow?.session({
      createSession: async (tokens) => {
        console.log(tokens); // if session is created, this function will be called with the tokens
      },
      expiredSession: async () => {
        console.log('expiredSession');
        redirectToSignin(); // if session is expired and refresh token is not valid, redirect to signin
      },
      doRefresh: true,
    });
  },
  component: () => <RootLayout />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: () => <Home />,
});

const aboutRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/about',
  component: () => <About />,
});

{/* Add other protected routes here */}

export const routerTree = rootRoute.addChildren([
  publicRoute.addChildren([signInRoute, signUpRoute, forgotPasswordRoute, forgotPasswordSuccessRoute]),
  protectedRoute.addChildren([dashboardRoute, aboutRoute]),
]);
```

## Props

### PassflowProvider

| Prop | Type | Description |
|------|------|-------------|
| url | string | Passflow server URL |
| appId | string | Application ID |
| createTenantForNewUser | boolean | Whether to create a tenant for new users |
| scopes | string[] | Array of required scopes |
| router | "default" \| "react-router" \| "wouter" \| "tanstack-router" | Router being used (optional) (default is native window navigation) |
| navigate | (options: NavigateOptions) => void | Navigation function (optional) (default is native window navigation) |

## Form Components

### SignIn

Component for user authentication.

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| successAuthRedirect | string | URL to redirect after successful sign in | Required |
| signUpPath | string | Path to sign up page (optional) | /signup |
| forgotPasswordPath | string | Path to forgot password page (optional) | /forgot-password |
| verifyMagicLinkPath | string | Path to verify magic link page (optional) | /verify-challenge-magic-link |
| verifyOTPPath | string | Path to verify OTP page (optional) | /verify-challenge-otp |
| federatedDisplayMode | "popup" \| "redirect" | Display mode for federated authentication (optional) | "popup" |

### SignUp

Component for user registration.

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| successAuthRedirect | string | URL to redirect after successful sign up | Required |
| signInPath | string | Path to sign in page (optional) | /signin |
| verifyMagicLinkPath | string | Path to verify magic link page (optional) | /verify-challenge-magic-link |
| verifyOTPPath | string | Path to verify OTP page (optional) | /verify-challenge-otp |
| federatedDisplayMode | "popup" \| "redirect" | Display mode for federated authentication (optional) | "popup" |

### ForgotPassword

Component for password recovery initiation.

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| successResetRedirect | string | URL to redirect after successful password reset | Required |
| signInPath | string | Path to sign in page (optional) | /signin |
| forgotPasswordSuccessPath | string | Path to success page after initiating password reset (optional) | /forgot-password/success |

### ForgotPasswordSuccess

Component for password recovery success. 

No props required.

### ResetPassword

Component for setting a new password.

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| successAuthRedirect | string | URL to redirect after successful password reset | Required |

### VerifyChallengeMagicLink

Component for verifying magic link authentication.

No props required.

### VerifyChallengeOTP

Component for OTP verification.

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| successAuthRedirect | string | URL to redirect after successful verification | Required |
| numInputs | number | Number of OTP input fields (optional) | 6 |
| shouldAutoFocus | boolean | Whether to autofocus the first input (optional) | true |
| signUpPath | string | Path to sign up page (optional) | /signup |

### InvitationJoin

Component for accepting invitations and joining organizations.

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| successAuthRedirect | string | URL to redirect after successful join | Required |
| signInPath | string | Path to sign in page (optional) | /signin |

## Hooks

### useAuth
Hook for authentication management. Provides methods for checking authentication status, obtaining tokens, and logging out.

```typescript
const { isAuthenticated, getTokens, logout, isLoading } = useAuth();
```

| Parameter | Type | Description |
|-----------|------|-------------|
| initialRefresh | `boolean` (optional) | Whether to refresh tokens on mount |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| isAuthenticated | `() => boolean` | Current authentication status |
| getTokens | `(doRefresh: boolean) => Promise<{ tokens: Tokens \| undefined; parsedTokens: ParsedTokens \| undefined; }>` | Function to get authentication tokens |
| logout | `() => void` | Function to log out user |
| isLoading | `boolean` | Loading state indicator |

### usePassflow
Hook for accessing the Passflow SDK instance. Must be used within PassflowProvider.

```typescript
const passflow = usePassflow();
```

**Returns:**

| Type | Description |
|------|-------------|
| `Passflow` | Passflow SDK instance |

### usePassflowStore
Hook for synchronizing state with Passflow SDK. Allows subscribing to token changes.

```typescript
const tokens = usePassflowStore([PassflowEvent.SignIn, ...]);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| events | `PassflowEvent[]` (optional) | Events to subscribe to |

**Returns:**

| Type | Description |
|------|-------------|
| `Tokens \| undefined` | Current tokens state |

### useSignIn
Hook for implementing sign-in functionality. Supports password, passkey, and passwordless authentication.

```typescript
const { fetch, isLoading, isError, error } = useSignIn();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| fetch | `(payload: PassflowPasskeyAuthenticateStartPayload \| PassflowSignInPayload \| PassflowPasswordlessSignInPayload, type: 'passkey' \| 'password' \| 'passwordless') => Promise<boolean \| string \| PassflowPasswordlessResponse>` | Sign in function |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| error | `string` | Error message |

### useSignUp
Hook for implementing registration functionality. Supports password, passkey, and passwordless registration.

```typescript
const { fetch, isLoading, isError, error } = useSignUp();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| fetch | `(payload: PassflowPasskeyRegisterStartPayload \| PassflowSignUpPayload \| PassflowPasswordlessSignInPayload, type: 'passkey' \| 'password' \| 'passwordless') => Promise<boolean \| PassflowPasswordlessResponse>` | Sign up function |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| error | `string` | Error message |

### useNavigation
Hook for navigation between pages. Supports various routers (react-router, wouter, tanstack-router).

```typescript
const { navigate, setNavigate } = useNavigation();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| navigate | `NavigateFunction` | Navigation function |
| setNavigate | `(newNavigate: NavigateFunction \| null) => void` | Function to update navigation handler |

### useProvider
Hook for working with federated authentication providers (OAuth).

```typescript
const { federatedWithPopup, federatedWithRedirect } = useProvider(redirectUrl);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| redirectUrl | `string` | URL to redirect after authentication |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| federatedWithPopup | `(provider: Providers) => void` | Popup authentication function |
| federatedWithRedirect | `(provider: Providers) => void` | Redirect authentication function |

### useResetPassword
Hook for resetting user password.

```typescript
const { fetch, isLoading, isError, error } = useResetPassword();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| fetch | `(newPassword: string) => Promise<boolean>` | Password reset function |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| error | `string` | Error message |

### useUserPasskeys
Hook for managing user passkeys (create, edit, delete).

```typescript
const { data, createUserPasskey, editUserPasskey, deleteUserPasskey } = useUserPasskeys();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| data | `PassflowUserPasskey[]` | List of user passkeys |
| createUserPasskey | `(relyingPartyId: string) => Promise<void>` | Create passkey function |
| editUserPasskey | `(newName: string, passkeyId: string) => Promise<void>` | Edit passkey function |
| deleteUserPasskey | `(passkeyId: string) => Promise<void>` | Delete passkey function |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| errorMessage | `string` | Error message |

### useAppSettings
Hook for retrieving application settings and password policies.

```typescript
const { appSettings, passwordPolicy } = useAppSettings();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| appSettings | `AppSettings \| null` | Application settings |
| passwordPolicy | `PassflowPasswordPolicySettings \| null` | Password policy settings |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| error | `string` | Error message |

### useAuthCloudRedirect
Hook for redirecting to Passflow Cloud.

```typescript
const redirect = useAuthCloudRedirect(cloudPassflowUrl);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| cloudPassflowUrl | `string` | Passflow Cloud URL |

**Returns:**

| Type | Description |
|------|-------------|
| `() => void` | Redirect function |

### useForgotPassword
Hook for initiating the password recovery process.

```typescript
const { fetch, isLoading, isError, error } = useForgotPassword();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| fetch | `(payload: PassflowSendPasswordResetEmailPayload) => Promise<boolean>` | Password recovery function |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| error | `string` | Error message |

### useJoinInvite
Hook for accepting organization invitations.

```typescript
const { fetch, isLoading, isError, error } = useJoinInvite();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| fetch | `(token: string) => Promise<boolean>` | Join invitation function |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| error | `string` | Error message |

### useLogout
Hook for logging out of the system.

```typescript
const { fetch, isLoading, isError, error } = useLogout();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| fetch | `() => Promise<boolean>` | Logout function |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| error | `string` | Error message |

### usePasswordlessComplete
Hook for completing passwordless authentication.

```typescript
const { fetch, isLoading, isError, error } = usePasswordlessComplete();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| fetch | `(payload: PassflowPasswordlessSignInCompletePayload) => Promise<PassflowValidationResponse \| null>` | Complete passwordless auth function |
| isLoading | `boolean` | Loading state |
| isError | `boolean` | Error state |
| error | `string` | Error message |
