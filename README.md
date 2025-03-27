# @passflow/passflow-react-sdk

This is a SDK for react application.

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
      <PassflowFlow
        federatedDisplayMode='redirect'
        successAuthRedirect='https://jwt.io'
        federatedCallbackUrl='https://jwt.io'
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
| federatedCallbackUrl | string | URL to redirect after successful federated authentication |
| federatedDisplayMode | "popup" \| "redirect" | Federated authentication display mode |
| pathPrefix | string | Prefix for all routes (optional) |

### React Router DOM

Example of integration with React Router DOM:

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
    </PassflowProviderWrapper>
  </Switch>
);
```

### TanStack Router

Example of integration with TanStack Router:

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

// routes.tsx
import { createRoute } from '@tanstack/react-router';
import { SignIn, SignUp, ForgotPassword, ForgotPasswordSuccess } from '@passflow/passflow-react-sdk';

const publicRoutes = [
  createRoute({
    path: '/signin',
    component: () => <SignIn />
  }),
  createRoute({
    path: '/signup',
    component: () => <SignUp />
  }),
  createRoute({
    path: '/forgot-password',
    component: () => (
      <ForgotPassword 
        successResetRedirect="/" 
        signInPath="/signin" 
        forgotPasswordSuccessPath="/forgot-password/success" 
      />
    )
  }),
  createRoute({
    path: '/forgot-password/success',
    component: () => <ForgotPasswordSuccess />
  })
];
```

## Props

### PassflowProvider

| Prop | Type | Description |
|------|------|-------------|
| url | string | Passflow server URL |
| appId | string | Application ID |
| createTenantForNewUser | boolean | Whether to create a tenant for new users |
| scopes | string[] | Array of required scopes |
| router | "react-router" \| "wouter" \| "tanstack-router" | Router being used |
| navigate | (options: NavigateOptions) => void | Navigation function |
