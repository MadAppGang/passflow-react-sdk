# Architecture Document: Passflow React SDK Refactoring

## Document Metadata

- **Version**: 1.0
- **Date**: 2026-01-09
- **Project**: Passflow React SDK (@passflow/react)
- **Session**: dev-arch-20260109-165618-496b7c83
- **Stack**: TypeScript 5.8.2, React 18/19, Vite, Vitest, Testing Library
- **Refactoring Approach**: Alternative 2 - Moderate Refactoring
- **Status**: Ready for Implementation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Design](#2-data-design)
3. [Technical Specifications](#3-technical-specifications)
4. [Security Design](#4-security-design)
5. [Implementation Plan](#5-implementation-plan)
6. [Testing Strategy](#6-testing-strategy)
7. [Appendices](#7-appendices)

---

## 1. System Overview

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Consumer Application                          │
│  (React App using @passflow/react SDK)                              │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ imports
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PUBLIC API SURFACE                                │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Components (src/index.ts)                                  │    │
│  │  - PassflowProvider                                         │    │
│  │  - PassflowFlow                                             │    │
│  │  - Form Components: SignIn, SignUp, ResetPassword, etc.    │    │
│  │  - UI Components: Button, Icon, Link, Fields, etc.         │    │
│  │  - Two-Factor: TwoFactorSetup, TwoFactorVerify             │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Hooks                                                       │    │
│  │  - useAuth, useSignIn, useSignUp, usePassflow               │    │
│  │  - useTwoFactorStatus, useTwoFactorSetup, etc.             │    │
│  │  - useNavigation, useProvider, useAppSettings               │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Re-exported from @passflow/core                            │    │
│  │  - Types, Passflow client, core SDK functions              │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     INTERNAL ARCHITECTURE                            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  1. Context Layer (State Management)                          │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  PassflowProvider (Root Provider)                     │   │  │
│  │  │    ├─ PassflowContext                                │   │  │
│  │  │    │    - Passflow SDK instance                      │   │  │
│  │  │    │    - App settings, password policy              │   │  │
│  │  │    │    - Configuration state                        │   │  │
│  │  │    │                                                  │   │  │
│  │  │    ├─ NavigationContext                              │   │  │
│  │  │    │    - Router integration (React Router, Wouter) │   │  │
│  │  │    │    - Navigation functions                       │   │  │
│  │  │    │                                                  │   │  │
│  │  │    └─ AuthContext                                    │   │  │
│  │  │         - Authentication state                       │   │  │
│  │  │         - Token management                           │   │  │
│  │  │         - Logout functions                           │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           │ consumes context                         │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  2. Hooks Layer (Business Logic)                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Core Hooks                                           │   │  │
│  │  │  - usePassflow (context accessor)                    │   │  │
│  │  │  - useAuth (authentication state)                    │   │  │
│  │  │  - useNavigation (router-agnostic navigation)        │   │  │
│  │  │  - useAppSettings (app config, theme)                │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Auth Flow Hooks                                      │   │  │
│  │  │  - useSignIn (password, passkey, passwordless)       │   │  │
│  │  │  - useSignUp (user registration)                     │   │  │
│  │  │  - useForgotPassword (password recovery)             │   │  │
│  │  │  - useResetPassword (password reset with token)      │   │  │
│  │  │  - usePasswordlessComplete (OTP/magic link)          │   │  │
│  │  │  - useJoinInvite (invitation acceptance)             │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Two-Factor Authentication Hooks (NEW)                │   │  │
│  │  │  - useTwoFactorStatus (check 2FA status)             │   │  │
│  │  │  - useTwoFactorSetup (enable 2FA with TOTP)          │   │  │
│  │  │  - useTwoFactorVerify (verify 2FA code)              │   │  │
│  │  │  - useTwoFactorManage (disable, regenerate codes)    │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Additional Hooks                                     │   │  │
│  │  │  - useProvider (OAuth federated login)               │   │  │
│  │  │  - useUserPasskeys (passkey CRUD operations)         │   │  │
│  │  │  - useLogout (user logout)                           │   │  │
│  │  │  - usePassflowStore (event synchronization)          │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           │ uses hooks                               │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  3. Component Layer (UI/UX)                                   │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Form Components (Complex, Stateful)                 │   │  │
│  │  │  - SignIn (password, passkey, passwordless, OAuth)   │   │  │
│  │  │  - SignUp (registration with multiple methods)       │   │  │
│  │  │  - ForgotPassword (password recovery)                │   │  │
│  │  │  - ResetPassword (password reset form)               │   │  │
│  │  │  - VerifyChallenge (OTP, magic link verification)    │   │  │
│  │  │  - InvitationJoin (invitation acceptance)            │   │  │
│  │  │  - TwoFactorSetup (2FA configuration with QR)        │   │  │
│  │  │  - TwoFactorVerify (2FA verification form)           │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  UI Components (Presentational)                       │   │  │
│  │  │  - Button (styled button with variants)              │   │  │
│  │  │  - Icon (SVG icon system)                            │   │  │
│  │  │  - Link (router-aware link)                          │   │  │
│  │  │  - FieldText, FieldPassword, FieldPhone (inputs)     │   │  │
│  │  │  - Dialog (Radix UI modal)                           │   │  │
│  │  │  - Popover (Radix UI popover)                        │   │  │
│  │  │  - Switch (toggle component)                         │   │  │
│  │  │  - ProvidersBox (OAuth provider buttons)             │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  Layout Components                                    │   │  │
│  │  │  - Wrapper (form container with branding)            │   │  │
│  │  │  - PassflowFlow (all-in-one routing flow)            │   │  │
│  │  │  - ErrorComponent (error display)                    │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           │ uses utilities                           │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  4. Utilities Layer (Pure Functions)                          │  │
│  │  - cn (Tailwind class merging)                                │  │
│  │  - validateUrl (URL validation)                               │  │
│  │  - getUrlWithTokens (token injection)                          │  │
│  │  - getAuthMethods (extract enabled auth methods)              │  │
│  │  - getFormLabels (i18n-ready labels)                          │  │
│  │  - validation-schemas (Yup schemas)                           │  │
│  │  - dayjs utilities (date formatting)                          │  │
│  │  - undefinedOnCatch (error handling helper)                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                          │
│                           │ calls                                    │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  5. @passflow/core SDK (External Dependency)                  │  │
│  │  - Authentication API calls                                    │  │
│  │  - Token management                                            │  │
│  │  - Passkey operations (WebAuthn)                               │  │
│  │  - Two-Factor operations (TOTP, recovery codes)                │  │
│  │  - OAuth provider integration                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Descriptions

#### 1.2.1 PassflowProvider (Root Context Provider)

**Location**: `src/components/provider/passflow-provider.tsx`

**Purpose**: Root context provider that initializes the Passflow SDK instance and manages global state.

**Responsibilities**:
- Initialize Passflow SDK instance from @passflow/core
- Manage configuration state (app settings, password policy, scopes)
- Provide context to all child components and hooks
- Handle router integration (React Router, Wouter, TanStack Router, etc.)
- Wrap children with nested context providers (PassflowContext, NavigationContext, AuthContext)

**Props**:
- `appId`: Passflow application ID
- `url`: Passflow API URL
- `scopes`: OAuth scopes
- `createTenantForNewUser`: Auto-create tenant flag
- `navigate`: Custom navigation function
- `router`: Router type ('default', 'react-router', 'wouter', etc.)
- `children`: React children

**Context Structure**:
```typescript
PassflowProvider
  └─ PassflowContext (SDK instance + state + dispatch)
       └─ NavigationContext (router integration)
            └─ AuthContext (auth state + tokens)
                 └─ {children}
```

#### 1.2.2 PassflowFlow (All-in-One Flow Component)

**Location**: `src/components/flow/passflow/index.tsx`

**Purpose**: Batteries-included routing flow with error boundaries.

**Features**:
- Automatic routing between auth forms
- Error boundary integration (withError HOC)
- Pre-configured paths for all auth flows
- Customizable redirect URLs

**Use Case**: Drop-in auth UI for rapid integration.

#### 1.2.3 Form Components

**Location**: `src/components/form/*`

**Pattern**: All form components follow a consistent pattern:
1. Use `react-hook-form` for form state management
2. Use custom hooks for business logic (e.g., `useSignIn`, `useSignUp`)
3. Use UI components for presentation (Button, FieldText, etc.)
4. Use context for global state (useAppSettings, useNavigation)
5. Wrapped with `withError` HOC for error boundary

**Form Components List**:

| Component | File | Purpose | Hooks Used |
|-----------|------|---------|------------|
| SignIn | `signin/index.tsx` | Sign in with password, passkey, passwordless, OAuth | `useSignIn`, `useProvider`, `useNavigation`, `useAppSettings` |
| SignUp | `signup/index.tsx` | User registration | `useSignUp`, `useNavigation`, `useAppSettings` |
| ForgotPassword | `forgot-password/forgot-password.tsx` | Initiate password recovery | `useForgotPassword`, `useNavigation` |
| ResetPassword | `reset-password/index.tsx` | Reset password with token | `useResetPassword`, `useNavigation` |
| VerifyChallenge | `verify-challenge/index.tsx` | OTP/magic link verification | `usePasswordlessComplete`, `useNavigation` |
| InvitationJoin | `invitation-join/index.tsx` | Accept organization invitation | `useJoinInvite`, `useNavigation` |
| TwoFactorSetup | `two-factor-setup/two-factor-setup-form.tsx` | Enable 2FA with TOTP | `useTwoFactorSetup`, `useNavigation` |
| TwoFactorVerify | `two-factor-verify/two-factor-verify-form.tsx` | Verify 2FA code | `useTwoFactorVerify`, `useNavigation` |

#### 1.2.4 UI Components

**Location**: `src/components/ui/*`

**Pattern**: Presentational components with minimal logic.

**UI Components List**:

| Component | Purpose | Dependencies |
|-----------|---------|--------------|
| Button | Styled button (primary, outlined, dark, clean) | Tailwind CSS, cn utility |
| Icon | SVG icon system (general, provider) | SVG assets |
| Link | Router-aware link component | useNavigation |
| FieldText | Text input with error states | - |
| FieldPassword | Password input with visibility toggle | - |
| FieldPhone | International phone input | react-international-phone |
| Dialog | Modal component | @radix-ui/react-dialog |
| Popover | Popover component | @radix-ui/react-popover |
| Switch | Toggle switch | - |
| ProvidersBox | OAuth provider buttons grid | Icon, Button |

#### 1.2.5 Hooks

**Location**: `src/hooks/*`

**Pattern**: Custom hooks for business logic.

**Hook Categories**:

1. **Core Hooks** (Context Accessors):
   - `usePassflow`: Access Passflow SDK instance
   - `useAuth`: Authentication state and token management
   - `useNavigation`: Router-agnostic navigation
   - `useAppSettings`: App configuration and theming

2. **Auth Flow Hooks** (State Management + API Calls):
   - `useSignIn`: Sign in operations (password, passkey, passwordless)
   - `useSignUp`: Registration operations
   - `useForgotPassword`: Password recovery initiation
   - `useResetPassword`: Password reset with token
   - `usePasswordlessComplete`: Complete passwordless flow (OTP/magic link)
   - `useJoinInvite`: Accept invitation

3. **Two-Factor Authentication Hooks** (2FA):
   - `useTwoFactorStatus`: Check if 2FA is enabled
   - `useTwoFactorSetup`: Enable 2FA (generate QR, confirm TOTP)
   - `useTwoFactorVerify`: Verify 2FA code or recovery code
   - `useTwoFactorManage`: Disable 2FA, regenerate recovery codes

4. **Additional Hooks**:
   - `useProvider`: OAuth federated login (popup/redirect)
   - `useUserPasskeys`: Passkey CRUD operations
   - `useLogout`: User logout
   - `usePassflowStore`: Event synchronization with @passflow/core
   - `useAuthCloudRedirect`: Passflow Cloud redirect

**Hook Return Pattern**:
```typescript
{
  // API methods
  fetch: (...) => Promise<...>,

  // State
  isLoading: boolean,
  isError: boolean,
  error: string,

  // Data (specific to hook)
  data: T | null,

  // Reset function
  reset: () => void,
}
```

#### 1.2.6 Utilities

**Location**: `src/utils/*`

**Purpose**: Pure functions for common operations.

**Utilities List**:
- `cn`: Tailwind class merging (clsx + tailwind-merge)
- `validateUrl`: URL validation helper
- `getUrlWithTokens`: Inject tokens into URL
- `getAuthMethods`: Extract enabled auth methods from app settings
- `getFormLabels`: Generate form labels (i18n-ready)
- `getUrlErrors`: Parse error from URL query params
- `validation-schemas`: Yup validation schemas for forms
- `dayjs`: Date formatting utilities
- `undefinedOnCatch`: Error handling helper
- `url-params`: URL query parameter utilities

### 1.3 Integration Points with @passflow/core

**@passflow/core SDK** is the underlying authentication client that handles all API calls to the Passflow backend.

**Integration Pattern**:
1. PassflowProvider initializes Passflow SDK instance
2. usePassflow hook provides access to SDK instance
3. Custom hooks (useSignIn, useSignUp, etc.) call SDK methods
4. SDK methods return promises with responses or throw errors
5. Hooks manage loading/error states and return results to components

**Key SDK Methods Used**:

| SDK Method | Used By Hook | Purpose |
|------------|--------------|---------|
| `passflow.signIn()` | useSignIn | Password authentication |
| `passflow.passkeyAuthenticate()` | useSignIn | Passkey authentication |
| `passflow.passwordlessSignIn()` | useSignIn | Passwordless authentication |
| `passflow.signUp()` | useSignUp | User registration |
| `passflow.forgotPassword()` | useForgotPassword | Initiate password recovery |
| `passflow.resetPassword()` | useResetPassword | Reset password |
| `passflow.completeChallenge()` | usePasswordlessComplete | Verify OTP/magic link |
| `passflow.beginTwoFactorSetup()` | useTwoFactorSetup | Start 2FA setup |
| `passflow.confirmTwoFactorSetup()` | useTwoFactorSetup | Confirm 2FA setup |
| `passflow.verifyTwoFactor()` | useTwoFactorVerify | Verify 2FA code |
| `passflow.getTwoFactorStatus()` | useTwoFactorStatus | Check 2FA status |
| `passflow.disableTwoFactor()` | useTwoFactorManage | Disable 2FA |
| `passflow.regenerateRecoveryCodes()` | useTwoFactorManage | Regenerate recovery codes |
| `passflow.getAppSettings()` | useAppSettings | Fetch app configuration |
| `passflow.getPasswordPolicySettings()` | useAppSettings | Fetch password policy |
| `passflow.getTokens()` | useAuth | Get access/refresh tokens |
| `passflow.logOut()` | useLogout | User logout |

**Re-exported from @passflow/core**:
- Types: `PassflowConfig`, `AppSettings`, `Tokens`, `ParsedTokens`, etc.
- Constants: `Providers` (OAuth providers enum)
- Interfaces: All request/response payloads

**Note**: The SDK handles token storage, refresh, and WebAuthn operations internally.

---

## 2. Data Design

### 2.1 Context State Structure

#### 2.1.1 PassflowContext State

**Location**: `src/context/passflow-context.ts`

**Purpose**: Global state for Passflow SDK configuration and app settings.

**State Shape**:
```typescript
type PassflowState = {
  // App configuration (fetched from API)
  appSettings: AppSettings | null;
  passwordPolicy: PassflowPasswordPolicySettings | null;

  // SDK configuration (from props)
  url?: string;
  appId?: string;
  scopes?: string[];
  createTenantForNewUser?: boolean;
  parseQueryParams?: boolean;
};
```

**State Management**:
- **Reducer**: `passflowReducer` handles `SET_PASSFLOW_STATE` action
- **Dispatch**: Used by `useAppSettings` to update state after API fetch
- **Initial State**: Minimal config, app settings fetched on mount

**Context Value**:
```typescript
type PassflowContextType = {
  state: PassflowState;
  dispatch: Dispatch<PassflowAction>;
  passflow: Passflow; // SDK instance
};
```

**Usage Pattern**:
```typescript
const context = useContext(PassflowContext);
const { state, dispatch, passflow } = context;

// Update state
dispatch({
  type: 'SET_PASSFLOW_STATE',
  payload: { appSettings, passwordPolicy },
});
```

#### 2.1.2 NavigationContext State

**Location**: `src/context/navigation-context.ts`

**Purpose**: Router-agnostic navigation abstraction.

**State Shape**:
```typescript
type NavigationContextValue = {
  navigate: NavigateFunction;
  setNavigate: (fn: NavigateFunction | null) => void;
  router: RouterType;
};

type NavigateFunction = (options: { to: string; search?: string }) => void;
type RouterType = 'default' | 'react-router' | 'wouter' | 'tanstack' | 'hash' | 'memory';
```

**Navigation Implementation**:
- **Default**: Uses browser `window.location.href`
- **React Router**: Uses `useNavigate()` hook
- **Wouter**: Uses `useLocation()` hook
- **TanStack Router**: Uses router's navigate function
- **Hash/Memory**: Custom implementations

**Usage Pattern**:
```typescript
const { navigate } = useNavigation();
navigate({ to: '/signin', search: '?error=unauthorized' });
```

#### 2.1.3 AuthContext State

**Location**: `src/context/auth-context.tsx`

**Purpose**: Authentication state and token management.

**State Shape**:
```typescript
type AuthContextValue = {
  isAuthenticated: () => boolean;
  logout: () => void;
  isLoading: boolean;
  getTokens: (doRefresh: boolean) => Promise<{
    tokens: Tokens | undefined;
    parsedTokens: ParsedTokens | undefined;
  }>;
};
```

**State Management**:
- **isAuthenticated**: Checks if user has valid tokens (via SDK)
- **getTokens**: Fetches tokens, optionally refreshing
- **logout**: Clears tokens and calls SDK logout
- **isLoading**: Loading state for async operations

**Usage Pattern**:
```typescript
const { isAuthenticated, getTokens, logout } = useAuth();

if (isAuthenticated()) {
  const { tokens, parsedTokens } = await getTokens(true);
  console.log('User ID:', parsedTokens.userId);
}
```

### 2.2 Hook State Patterns

All custom hooks follow a consistent state pattern for predictable behavior.

#### 2.2.1 Standard Hook State Pattern

**Pattern**:
```typescript
export const useCustomHook = () => {
  const passflow = usePassflow(); // Access SDK

  // State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<DataType | null>(null);

  // API method
  const fetch = useCallback(async (payload: PayloadType) => {
    setIsLoading(true);
    setIsError(false);
    setError('');

    try {
      const response = await passflow.apiMethod(payload);
      setData(response);
      return response;
    } catch (e) {
      setIsError(true);
      const err = e as Error;
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  // Reset function
  const reset = useCallback(() => {
    setIsError(false);
    setError('');
    setData(null);
  }, []);

  return { fetch, isLoading, isError, error, data, reset };
};
```

**Benefits**:
- Consistent API across all hooks
- Easy to test (predictable state transitions)
- Error handling baked in
- Reset functionality for form clearing

#### 2.2.2 Multi-Step Hook State Pattern (Two-Factor Example)

**Pattern** (for hooks with multiple steps):
```typescript
export type TwoFactorSetupStep = 'idle' | 'setup' | 'complete';

export const useTwoFactorSetup = () => {
  const passflow = usePassflow();

  // State
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [step, setStep] = useState<TwoFactorSetupStep>('idle');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Step 1: Begin setup
  const beginSetup = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await passflow.beginTwoFactorSetup();
      setSetupData(response); // Contains QR code data
      setStep('setup');
      return response;
    } catch (e) {
      setIsError(true);
      setError((e as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  // Step 2: Confirm setup
  const confirmSetup = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const response = await passflow.confirmTwoFactorSetup(code);
      setRecoveryCodes(response.recovery_codes);
      setStep('complete');
      return response;
    } catch (e) {
      setIsError(true);
      setError((e as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const reset = useCallback(() => {
    setSetupData(null);
    setRecoveryCodes([]);
    setStep('idle');
    setIsError(false);
    setError('');
  }, []);

  return {
    setupData,
    recoveryCodes,
    step,
    beginSetup,
    confirmSetup,
    reset,
    isLoading,
    isError,
    error,
  };
};
```

**Benefits**:
- State machine pattern (idle → setup → complete)
- Multiple API calls coordinated
- Progressive data accumulation (setupData, then recoveryCodes)
- Clear separation of concerns per step

### 2.3 Data Flow from Provider to Components

**Flow Diagram**:
```
User Action (e.g., Click "Sign In" button)
    │
    ▼
Component (SignIn)
    │
    ├─ Reads context via useAppSettings() → appSettings, passwordPolicy
    ├─ Reads context via useNavigation() → navigate function
    │
    ▼
Hook (useSignIn)
    │
    ├─ Accesses SDK via usePassflow() → passflow instance
    │
    ▼
API Call (passflow.signIn(payload))
    │
    ▼
@passflow/core SDK
    │
    ├─ Makes HTTP request to Passflow API
    ├─ Stores tokens in localStorage/sessionStorage
    │
    ▼
Response/Error
    │
    ▼
Hook (useSignIn)
    │
    ├─ Updates state: setIsLoading(false)
    ├─ On success: returns response
    ├─ On error: setIsError(true), setError(message)
    │
    ▼
Component (SignIn)
    │
    ├─ On success: navigate to redirect URL
    ├─ On error: display error message
    │
    ▼
UI Update (re-render with new state)
```

**Example: Sign In Flow**

1. **User fills form and submits**:
   ```tsx
   <form onSubmit={(e) => {
     e.preventDefault();
     validateSignIn(); // Validate and submit
   }}>
   ```

2. **Component validates and calls hook**:
   ```tsx
   const { fetch, isLoading, isError, error } = useSignIn();

   const onSubmitHandler = async (data) => {
     const status = await fetch(data, 'password');
     if (status) {
       navigate({ to: successRedirect });
     }
   };
   ```

3. **Hook calls SDK**:
   ```tsx
   const fetch = async (payload, type) => {
     setIsLoading(true);
     try {
       if (type === 'password') {
         await passflow.signIn(payload);
       }
       return true;
     } catch (e) {
       setIsError(true);
       setError(e.message);
       return false;
     } finally {
       setIsLoading(false);
     }
   };
   ```

4. **SDK makes API call**:
   - POST to `/auth/signin`
   - Stores tokens in storage
   - Returns response or throws error

5. **Component reacts to state**:
   ```tsx
   {isLoading && <Spinner />}
   {isError && <ErrorMessage>{error}</ErrorMessage>}
   ```

**Data Flow Characteristics**:
- **Unidirectional**: Data flows down from context → hooks → components
- **Event-driven**: User actions trigger state updates
- **Async**: All API calls are async with loading/error states
- **Decoupled**: Components don't know about SDK internals
- **Type-safe**: TypeScript enforces correct types throughout

---

## 3. Technical Specifications

### 3.1 Technology Stack Details

#### 3.1.1 Core Technologies

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| TypeScript | 5.8.2 | Type-safe development | Strict mode enabled |
| React | ^18.0.0 \|\| ^19.0.0 | UI framework | Peer dependency |
| React DOM | ^18.0.0 \|\| ^19.0.0 | DOM rendering | Peer dependency |
| Vite | ^6.3.5 | Build tool | Fast dev server, optimized builds |

#### 3.1.2 Testing Stack (NEW)

| Technology | Version | Purpose | Installation |
|------------|---------|---------|--------------|
| Vitest | ^2.0.0 | Test runner | `pnpm add -D vitest` |
| @testing-library/react | ^16.0.0 | React component testing | `pnpm add -D @testing-library/react` |
| @testing-library/user-event | ^14.5.0 | User interaction simulation | `pnpm add -D @testing-library/user-event` |
| @testing-library/jest-dom | ^6.1.0 | DOM matchers | `pnpm add -D @testing-library/jest-dom` |
| @vitest/coverage-v8 | ^2.0.0 | Coverage reporting | `pnpm add -D @vitest/coverage-v8` |
| @vitest/ui | ^2.0.0 | UI for test results | `pnpm add -D @vitest/ui` |

**Why Vitest?**
- Native Vite integration (no configuration overhead)
- Faster than Jest (ES modules, no transpilation)
- Jest-compatible API (easy migration from Jest)
- Built-in coverage with v8 (no Istanbul needed)
- Watch mode with HMR (instant feedback)

#### 3.1.3 UI/Form Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| react-hook-form | ^7.56.4 | Form state management |
| yup | ^1.6.1 | Validation schemas |
| @radix-ui/react-dialog | ^1.1.14 | Modal/dialog primitives |
| @radix-ui/react-popover | ^1.1.14 | Popover primitives |
| react-international-phone | ^4.5.0 | Phone number input |
| react-otp-input | ^3.1.1 | OTP code input |
| react-error-boundary | ^4.1.2 | Error boundary HOC |

#### 3.1.4 Styling

| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | (via PostCSS) | Utility-first CSS |
| tailwindcss-scoped-preflight | ^3.4.12 | Scoped CSS reset |
| clsx | ^2.1.1 | Class name utility |
| tailwind-merge | ^2.6.0 | Tailwind class merging |

#### 3.1.5 Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| dayjs | ^1.11.13 | Date formatting |
| phone | ^3.1.59 | Phone validation |
| query-string | ^9.2.0 | URL query parsing |
| lodash | ^4.17.21 | Utility functions |
| history | ^5.3.0 | Browser history management |

#### 3.1.6 Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| @biomejs/biome | ^1.9.4 | Linting & formatting |
| vite-plugin-dts | ^4.5.4 | TypeScript declarations |
| vite-plugin-environment | ^1.1.3 | Environment variables |
| cssnano | ^7.0.7 | CSS minification |
| tsc-alias | ^1.8.16 | Path alias resolution |

#### 3.1.7 Dependencies to Remove

Based on requirements analysis, these dependencies are unused and will be removed:

| Dependency | Reason |
|------------|--------|
| classnames | Not used, clsx does the same |
| formik | Not used, react-hook-form is used |
| querystringify | Replaced by query-string |
| @types/jest | Using Vitest, not Jest |
| @storybook/react | No stories exist |
| @storybook/react-vite | No stories exist |

**Bundle Size Impact**: Estimated reduction of ~200KB (unminified).

### 3.2 Configuration Requirements

#### 3.2.1 vitest.config.ts

**Location**: `/Users/jack/mag/passflow/passflow-react-sdk/vitest.config.ts`

**Purpose**: Configure Vitest test runner.

**Configuration**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./src/test/setup.ts'],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        'src/main.tsx',
        'src/app.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
    },

    // Globals
    globals: true,

    // Watch mode
    watch: false,

    // Reporters
    reporters: ['verbose'],
  },

  // Resolve aliases (must match tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Key Settings**:
- **environment: 'jsdom'**: Simulates browser DOM
- **globals: true**: Use `describe`, `it`, `expect` without imports
- **coverage.provider: 'v8'**: Fast native coverage
- **coverage.thresholds**: 75% minimum coverage
- **setupFiles**: Global test setup (mocks, matchers)

#### 3.2.2 src/test/setup.ts

**Location**: `/Users/jack/mag/passflow/passflow-react-sdk/src/test/setup.ts`

**Purpose**: Global test setup and mocks.

**Setup File**:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (for theme detection)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (for Radix UI)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
global.sessionStorage = localStorageMock as any;

// Mock navigator.credentials (for passkey tests)
Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn(),
    get: vi.fn(),
  },
  writable: true,
});
```

#### 3.2.3 package.json Scripts

**Add test scripts**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

**Script Descriptions**:
- `test`: Run tests in watch mode
- `test:ui`: Open Vitest UI in browser
- `test:run`: Run tests once (CI mode)
- `test:coverage`: Run tests with coverage report
- `test:watch`: Run tests in watch mode (alias)

#### 3.2.4 tsconfig.json

**Ensure paths are configured**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### 3.3 Proposed Utils Structure After Flattening

#### 3.3.1 Current Structure (Before Refactoring)

```
src/utils/
├── cn/
│   └── index.ts                (4 lines)
├── dayjs/
│   ├── format.ts               (multi-file, keep)
│   └── index.ts
├── get-app-version/
│   └── index.ts                (9 lines)
├── get-auth-methods/
│   └── index.ts                (100 lines)
├── get-form-labels/
│   └── index.ts                (60 lines)
├── get-url-errors/
│   └── index.ts                (11 lines)
├── get-url-with-tokens/
│   └── index.ts                (17 lines)
├── undefined-on-catch/
│   └── index.ts                (5 lines)
├── url-params/
│   └── index.ts                (80 lines)
├── validate-url/
│   └── index.ts                (6 lines)
├── validation-schemas/
│   └── index.ts                (multi-schema, keep)
└── index.ts                    (re-exports)
```

**Problem**: Unnecessary nesting for single-file utilities.

#### 3.3.2 Proposed Structure (After Refactoring)

```
src/utils/
├── cn.ts                       (flatten from cn/index.ts)
├── validate-url.ts             (flatten from validate-url/index.ts)
├── undefined-on-catch.ts       (flatten from undefined-on-catch/index.ts)
├── get-url-errors.ts           (flatten from get-url-errors/index.ts)
├── get-url-with-tokens.ts      (flatten from get-url-with-tokens/index.ts)
├── get-app-version.ts          (flatten from get-app-version/index.ts)
├── get-auth-methods.ts         (flatten from get-auth-methods/index.ts)
├── get-form-labels.ts          (flatten from get-form-labels/index.ts)
├── url-params.ts               (flatten from url-params/index.ts)
├── dayjs/                      (keep, multi-file)
│   ├── format.ts
│   └── index.ts
├── validation-schemas/         (keep, may grow)
│   └── index.ts
└── index.ts                    (update exports)
```

**Benefits**:
- Shorter import paths
- Easier file navigation
- Reduced directory nesting
- No change to public API (exports remain the same)

#### 3.3.3 Migration Plan for Utils

**Step 1**: Flatten single-file utilities
```bash
# Move file and update imports
mv src/utils/cn/index.ts src/utils/cn.ts
rm -rf src/utils/cn/

# Update src/utils/index.ts
# Change: export * from './cn';
# To:     export * from './cn';  (no change, TS finds .ts file)
```

**Step 2**: Update internal imports
```typescript
// Before
import { cn } from '@/utils/cn';

// After (no change, works automatically)
import { cn } from '@/utils/cn';
```

**Step 3**: Keep multi-file utilities as-is
- `dayjs/` (has format.ts + index.ts)
- `validation-schemas/` (may add more schemas)

**Step 4**: Verify build and tests pass
```bash
pnpm build
pnpm test:run
```

**Risk**: Low (internal change only, no public API impact)

---

## 4. Security Design

### 4.1 No Security Impact (Internal Refactoring Only)

**Assessment**: This refactoring is **internal structural changes only** and has **NO security impact**.

**Rationale**:
1. **No changes to authentication logic**: All auth flows remain unchanged
2. **No changes to token management**: SDK handles tokens, no changes to storage
3. **No changes to API calls**: All HTTP requests go through @passflow/core SDK
4. **No changes to crypto operations**: Passkeys/WebAuthn handled by SDK + browser
5. **No changes to data validation**: Yup schemas remain unchanged
6. **No new dependencies**: Only adding testing libraries (dev dependencies)

### 4.2 Security Considerations for Testing

#### 4.2.1 Test Data

**Rule**: **NEVER use real credentials or secrets in test files.**

**Best Practices**:
- Use mock data for all tests
- Use fake email addresses (test@example.com)
- Use fake phone numbers (+1234567890)
- Use fake tokens (mock JWT strings)
- Never commit `.env` files with real credentials

**Example**:
```typescript
// GOOD: Mock data
const mockUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

const mockTokens = {
  access_token: 'mock.jwt.token',
  refresh_token: 'mock.refresh.token',
};

// BAD: Real data (NEVER do this)
const realUser = {
  email: 'real.user@company.com',  // ❌ NEVER
  password: 'RealPassword123!',     // ❌ NEVER
};
```

#### 4.2.2 Mocking External Services

**Rule**: **NEVER make real API calls in unit tests.**

**Pattern**: Mock all @passflow/core SDK methods.

**Example**:
```typescript
import { vi } from 'vitest';
import { Passflow } from '@passflow/core';

// Mock SDK
vi.mock('@passflow/core', () => ({
  Passflow: vi.fn().mockImplementation(() => ({
    signIn: vi.fn().mockResolvedValue(true),
    getAppSettings: vi.fn().mockResolvedValue(mockAppSettings),
    getTokens: vi.fn().mockResolvedValue(mockTokens),
  })),
}));
```

#### 4.2.3 Environment Variables

**Rule**: **Use separate test environment config.**

**Setup**:
```typescript
// .env.test (for test environment)
VITE_PASSFLOW_URL=http://localhost:3000
VITE_PASSFLOW_APP_ID=test-app-id
```

**Load in test setup**:
```typescript
// src/test/setup.ts
import { loadEnv } from 'vite';

const env = loadEnv('test', process.cwd(), '');
process.env = { ...process.env, ...env };
```

#### 4.2.4 Coverage Reports

**Rule**: **Do not expose secrets in coverage reports.**

**Configuration** (already set in vitest.config.ts):
```typescript
coverage: {
  exclude: [
    'node_modules/',
    'src/test/',
    '**/*.config.*',
    // Exclude files that might contain secrets
    '**/*.env',
    '**/*.env.*',
  ],
}
```

### 4.3 Security Best Practices (Existing, No Changes)

**Current security measures** (maintained during refactoring):

1. **Token Storage**: SDK handles token storage in httpOnly cookies or localStorage (user choice)
2. **HTTPS Only**: All API calls use HTTPS in production
3. **CORS**: API server enforces CORS policies
4. **XSS Protection**: React escapes all user input by default
5. **CSRF Protection**: SDK includes CSRF tokens in requests
6. **Password Validation**: Yup schemas enforce password policy
7. **Passkey Security**: WebAuthn handled by browser (secure by design)
8. **OAuth Security**: OAuth flows follow best practices (state, PKCE)

**No changes to any of these measures.**

---

## 5. Implementation Plan

### 5.1 Overview

**Approach**: Incremental refactoring in 5 phases.

**Principles**:
- No breaking changes to public API
- Write tests before refactoring
- One phase at a time
- Validate after each phase
- Rollback if issues arise

**Total Estimated Time**: 2-3 weeks

### 5.2 Phase 1: Foundation & Testing Infrastructure

**Goal**: Set up testing infrastructure and fix critical issues without breaking changes.

**Duration**: 3-4 days

#### 5.2.1 Tasks

| Task | Description | Estimated Time | Risk |
|------|-------------|----------------|------|
| 1.1 | Install Vitest + Testing Library dependencies | 30 min | Low |
| 1.2 | Create `vitest.config.ts` | 1 hour | Low |
| 1.3 | Create `src/test/setup.ts` with mocks | 2 hours | Medium |
| 1.4 | Add test scripts to `package.json` | 15 min | Low |
| 1.5 | Write first utility tests (cn, validateUrl, etc.) | 4 hours | Low |
| 1.6 | Remove unused dependencies (formik, classnames, @types/jest) | 1 hour | Medium |
| 1.7 | Fix cleanup() redundancy in useSignIn | 30 min | Low |
| 1.8 | Run tests and fix any issues | 2 hours | Medium |
| 1.9 | Run build and verify no breakage | 1 hour | Low |

**Subtotal**: ~12 hours

#### 5.2.2 Validation Criteria

- [ ] All new tests pass (utilities)
- [ ] Build succeeds without errors
- [ ] No public API changes (exports unchanged)
- [ ] Bundle size decreases (removed dependencies)
- [ ] Coverage report generated successfully

#### 5.2.3 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Test setup fails | Use official Vitest docs, copy setup from examples |
| Dependencies conflict | Use exact versions from other Vite + Vitest projects |
| Removing formik breaks code | Search codebase first (already confirmed unused) |
| Build breaks after changes | Test build after each change, rollback if needed |

#### 5.2.4 Rollback Plan

If Phase 1 fails:
1. Revert dependency changes: `git checkout package.json pnpm-lock.yaml`
2. Remove test files: `rm vitest.config.ts src/test/setup.ts`
3. Revert useSignIn fix: `git checkout src/hooks/use-signin.ts`
4. Run build to confirm: `pnpm build`

### 5.3 Phase 2: Naming & Structure Fixes

**Goal**: Fix typos and flatten utils directory without public API changes.

**Duration**: 2-3 days

#### 5.3.1 Tasks

| Task | Description | Estimated Time | Risk |
|------|-------------|----------------|------|
| 2.1 | Rename `varify-challenge-success.tsx` → `verify-challenge-success.tsx` | 30 min | Low |
| 2.2 | Rename `varify-challenge-otp-redirect.tsx` → `verify-challenge-otp-redirect.tsx` | 30 min | Low |
| 2.3 | Update imports for renamed files | 1 hour | Medium |
| 2.4 | Flatten utils: `cn/index.ts` → `cn.ts` | 2 hours | Medium |
| 2.5 | Flatten utils: `validate-url/index.ts` → `validate-url.ts` | 30 min | Low |
| 2.6 | Flatten utils: `undefined-on-catch/index.ts` → `undefined-on-catch.ts` | 30 min | Low |
| 2.7 | Flatten utils: `get-app-version/index.ts` → `get-app-version.ts` | 30 min | Low |
| 2.8 | Flatten utils: `get-url-errors/index.ts` → `get-url-errors.ts` | 30 min | Low |
| 2.9 | Flatten utils: `get-url-with-tokens/index.ts` → `get-url-with-tokens.ts` | 30 min | Low |
| 2.10 | Flatten utils: `get-auth-methods/index.ts` → `get-auth-methods.ts` | 30 min | Low |
| 2.11 | Flatten utils: `get-form-labels/index.ts` → `get-form-labels.ts` | 30 min | Low |
| 2.12 | Flatten utils: `url-params/index.ts` → `url-params.ts` | 30 min | Low |
| 2.13 | Update `src/utils/index.ts` exports | 1 hour | Low |
| 2.14 | Run tests and verify all pass | 1 hour | Medium |
| 2.15 | Run build and verify no breakage | 30 min | Low |

**Subtotal**: ~10 hours

#### 5.3.2 Validation Criteria

- [ ] All files renamed correctly
- [ ] No broken imports (build succeeds)
- [ ] All tests pass
- [ ] Public API unchanged (exports remain same)
- [ ] Git history shows clean renames (use `git mv`)

#### 5.3.3 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Broken imports after rename | Use IDE refactoring (auto-updates imports) |
| Missed import updates | Use `grep` to find all references before renaming |
| Tests fail after flattening | Update test imports, verify one file at a time |
| Build fails | Test build after each batch of changes |

#### 5.3.4 Rollback Plan

If Phase 2 fails:
1. Revert all file changes: `git checkout src/`
2. Run build to confirm: `pnpm build`
3. Run tests to confirm: `pnpm test:run`

### 5.4 Phase 3: Comprehensive Test Coverage (Hooks & Utils)

**Goal**: Achieve 75%+ test coverage for hooks and utilities.

**Duration**: 5-6 days

#### 5.4.1 Tasks

| Task | Description | Estimated Time | Risk |
|------|-------------|----------------|------|
| 3.1 | Write tests for useSignIn hook | 3 hours | Medium |
| 3.2 | Write tests for useSignUp hook | 2 hours | Low |
| 3.3 | Write tests for useForgotPassword hook | 1 hour | Low |
| 3.4 | Write tests for useResetPassword hook | 1 hour | Low |
| 3.5 | Write tests for usePasswordlessComplete hook | 2 hours | Medium |
| 3.6 | Write tests for useAuth hook | 2 hours | Medium |
| 3.7 | Write tests for useAppSettings hook | 3 hours | High |
| 3.8 | Write tests for useNavigation hook | 2 hours | Low |
| 3.9 | Write tests for useProvider hook | 2 hours | Medium |
| 3.10 | Write tests for useUserPasskeys hook | 2 hours | Medium |
| 3.11 | Write tests for useLogout hook | 1 hour | Low |
| 3.12 | Write tests for useTwoFactorStatus hook | 1 hour | Low |
| 3.13 | Write tests for useTwoFactorSetup hook | 3 hours | Medium |
| 3.14 | Write tests for useTwoFactorVerify hook | 2 hours | Medium |
| 3.15 | Write tests for useTwoFactorManage hook | 2 hours | Medium |
| 3.16 | Write tests for remaining utilities | 4 hours | Low |
| 3.17 | Write tests for validation schemas | 2 hours | Low |
| 3.18 | Set up coverage reporting and CI integration | 2 hours | Low |
| 3.19 | Review coverage report, identify gaps | 2 hours | Low |
| 3.20 | Write additional tests to reach 75% threshold | 4 hours | Medium |

**Subtotal**: ~41 hours (~1 week)

#### 5.4.2 Test Categories

**Hooks** (20 hooks × ~2 hours avg = 40 hours):
- Core: usePassflow, useAuth, useNavigation, useAppSettings
- Auth: useSignIn, useSignUp, useForgotPassword, useResetPassword, usePasswordlessComplete
- 2FA: useTwoFactorStatus, useTwoFactorSetup, useTwoFactorVerify, useTwoFactorManage
- Additional: useProvider, useUserPasskeys, useLogout, useJoinInvite, usePassflowStore, useAuthCloudRedirect, useOutsideClick

**Utilities** (~12 utils × 30 min avg = 6 hours):
- cn, validateUrl, undefinedOnCatch, getUrlErrors, getUrlWithTokens, getAppVersion
- getAuthMethods, getFormLabels, urlParams
- dayjs utilities, validation schemas

#### 5.4.3 Validation Criteria

- [ ] All hooks have unit tests
- [ ] All utilities have unit tests
- [ ] Coverage report shows ≥75% overall
- [ ] Coverage report shows ≥80% for hooks
- [ ] Coverage report shows ≥90% for utilities
- [ ] All tests pass
- [ ] No flaky tests (run 10 times, all pass)

#### 5.4.4 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Hard to mock @passflow/core SDK | Create test helper for mocking SDK methods |
| Context providers hard to test | Create `renderWithProviders` test utility |
| Async tests fail intermittently | Use `waitFor` from Testing Library, increase timeout |
| Coverage threshold too high | Adjust threshold to 70% initially, increase gradually |
| Tests reveal existing bugs | Fix bugs as found (not breaking changes) |

#### 5.4.5 Test Utilities to Create

**Create `src/test/utils.tsx`**:
```typescript
import { render, RenderOptions } from '@testing-library/react';
import { PassflowProvider } from '@/components/provider';
import { ReactElement } from 'react';

// Mock Passflow SDK
export const mockPassflowSDK = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  getAppSettings: vi.fn(),
  getPasswordPolicySettings: vi.fn(),
  beginTwoFactorSetup: vi.fn(),
  confirmTwoFactorSetup: vi.fn(),
  // ... all SDK methods
};

// Render with PassflowProvider
export const renderWithProvider = (
  ui: ReactElement,
  options?: RenderOptions & { passflowConfig?: any }
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <PassflowProvider
      appId="test-app-id"
      url="http://localhost:3000"
      {...(options?.passflowConfig || {})}
    >
      {children}
    </PassflowProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};
```

#### 5.4.6 Example Test Pattern

**Hook Test Example** (`src/hooks/__tests__/use-signin.test.ts`):
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useSignIn } from '../use-signin';
import { mockPassflowSDK } from '@/test/utils';

describe('useSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sign in with password successfully', async () => {
    mockPassflowSDK.signIn.mockResolvedValue(true);

    const { result } = renderHook(() => useSignIn());

    const payload = {
      email: 'test@example.com',
      password: 'Test123!',
      scopes: [],
    };

    const status = await result.current.fetch(payload, 'password');

    expect(status).toBe(true);
    expect(mockPassflowSDK.signIn).toHaveBeenCalledWith(payload);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should handle sign in error', async () => {
    mockPassflowSDK.signIn.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useSignIn());

    const status = await result.current.fetch({ email: 'test@example.com', password: 'wrong', scopes: [] }, 'password');

    await waitFor(() => {
      expect(status).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Invalid credentials');
    });
  });
});
```

**Utility Test Example** (`src/utils/__tests__/cn.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('should merge Tailwind classes correctly', () => {
    expect(cn('p-4 p-8')).toBe('p-8'); // Last wins
  });
});
```

#### 5.4.7 Rollback Plan

If Phase 3 fails:
1. Keep existing tests (no harm)
2. Adjust coverage thresholds lower
3. Continue to Phase 4 (tests don't block refactoring)

### 5.5 Phase 4: Component Tests & Polish

**Goal**: Complete testing and cleanup.

**Duration**: 3-4 days

#### 5.5.1 Tasks

| Task | Description | Estimated Time | Risk |
|------|-------------|----------------|------|
| 4.1 | Write tests for Button component | 1 hour | Low |
| 4.2 | Write tests for Icon component | 1 hour | Low |
| 4.3 | Write tests for Link component | 1 hour | Low |
| 4.4 | Write tests for FieldText component | 2 hours | Medium |
| 4.5 | Write tests for FieldPassword component | 2 hours | Medium |
| 4.6 | Write tests for FieldPhone component | 2 hours | Medium |
| 4.7 | Write tests for Switch component | 1 hour | Low |
| 4.8 | Write tests for ProvidersBox component | 2 hours | Medium |
| 4.9 | Write integration test for SignIn form | 4 hours | High |
| 4.10 | Write integration test for SignUp form | 3 hours | Medium |
| 4.11 | Write integration test for TwoFactorSetup form | 3 hours | Medium |
| 4.12 | Remove Storybook (if no stories added) | 1 hour | Low |
| 4.13 | Update README with testing instructions | 2 hours | Low |
| 4.14 | Add CI configuration for tests | 2 hours | Medium |
| 4.15 | Review all coverage reports | 2 hours | Low |
| 4.16 | Final build and test run | 1 hour | Low |

**Subtotal**: ~30 hours (~4 days)

#### 5.5.2 Integration Test Example

**SignIn Form Integration Test** (`src/components/form/signin/__tests__/signin.test.tsx`):
```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignIn } from '../index';
import { renderWithProvider, mockPassflowSDK } from '@/test/utils';

describe('SignIn Form Integration', () => {
  it('should complete full sign-in flow', async () => {
    mockPassflowSDK.getAppSettings.mockResolvedValue({
      auth_strategies: [
        { type: 'internal', strategy: { challenge: 'password', factor: 'email' } },
      ],
      defaults: { scopes: [], redirect: '/dashboard' },
    });
    mockPassflowSDK.signIn.mockResolvedValue(true);

    renderWithProvider(<SignIn successAuthRedirect="/dashboard" />);

    // Wait for app settings to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill form
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Test123!');

    // Submit
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify API call
    await waitFor(() => {
      expect(mockPassflowSDK.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Test123!',
        scopes: [],
      });
    });
  });

  it('should display error on invalid credentials', async () => {
    mockPassflowSDK.signIn.mockRejectedValue(new Error('Invalid credentials'));

    renderWithProvider(<SignIn />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

#### 5.5.3 Validation Criteria

- [ ] All UI components have unit tests
- [ ] All form components have integration tests
- [ ] Coverage report shows ≥70% for components
- [ ] All tests pass consistently (no flakiness)
- [ ] README updated with test instructions
- [ ] CI pipeline runs tests automatically
- [ ] Storybook removed (if no stories)

#### 5.5.4 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Integration tests too complex | Start with happy path, add edge cases later |
| Radix UI components hard to test | Use `@testing-library/user-event` for interactions |
| Tests slow | Use test.skip for slow tests, run in CI only |
| CI setup complex | Use GitHub Actions template for Vite + Vitest |

#### 5.5.5 CI Configuration Example

**`.github/workflows/test.yml`**:
```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

#### 5.5.6 Rollback Plan

If Phase 4 fails:
1. Keep existing tests (no harm)
2. Skip component tests if too complex
3. Keep Storybook if time constraints
4. Continue to Phase 5 (documentation)

### 5.6 Phase 5: Documentation & Release

**Goal**: Update documentation and prepare for release.

**Duration**: 1-2 days

#### 5.6.1 Tasks

| Task | Description | Estimated Time | Risk |
|------|-------------|----------------|------|
| 5.1 | Update README with testing section | 2 hours | Low |
| 5.2 | Update README with new utility structure | 1 hour | Low |
| 5.3 | Create CONTRIBUTING.md with test guidelines | 2 hours | Low |
| 5.4 | Update CHANGELOG.md | 1 hour | Low |
| 5.5 | Create migration guide (internal only) | 2 hours | Low |
| 5.6 | Review all documentation for accuracy | 1 hour | Low |
| 5.7 | Final build and test run | 1 hour | Low |
| 5.8 | Tag release (v0.2.0) | 30 min | Low |
| 5.9 | Publish to npm (if applicable) | 30 min | Medium |

**Subtotal**: ~11 hours (~1.5 days)

#### 5.6.2 Documentation Updates

**README.md additions**:

```markdown
## Testing

This project uses Vitest and React Testing Library for testing.

### Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with coverage
pnpm test:coverage

# Open Vitest UI
pnpm test:ui
```

### Coverage

Current coverage: ~75% (target)

- Hooks: 80%+
- Utils: 90%+
- Components: 70%+

### Writing Tests

See [CONTRIBUTING.md](./CONTRIBUTING.md) for test guidelines.
```

**CONTRIBUTING.md** (new file):
```markdown
# Contributing Guidelines

## Testing Guidelines

### Writing Tests

All new features must include tests:

1. **Hooks**: Unit tests with mocked SDK
2. **Utils**: Pure function tests
3. **Components**: Integration tests with user interactions

### Test Structure

- Use `describe` blocks for grouping
- Use `it` for individual tests
- Use `beforeEach` for setup
- Use `afterEach` for cleanup

### Mocking

- Mock @passflow/core SDK methods
- Mock localStorage/sessionStorage
- Mock window.matchMedia (for theme tests)
- Mock navigator.credentials (for passkey tests)

See `src/test/utils.tsx` for test helpers.
```

#### 5.6.3 Validation Criteria

- [ ] README updated with testing instructions
- [ ] CONTRIBUTING.md created
- [ ] CHANGELOG.md updated
- [ ] All documentation reviewed
- [ ] Final build succeeds
- [ ] Final tests pass
- [ ] Release tagged
- [ ] (Optional) npm published

#### 5.6.4 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Documentation incomplete | Review with team before release |
| Breaking changes missed | Double-check exports in index.ts |
| npm publish fails | Test publish in dry-run mode first |

#### 5.6.5 Release Checklist

- [ ] All phases complete
- [ ] All tests passing
- [ ] Coverage ≥75%
- [ ] Build succeeds
- [ ] No console warnings
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Git tag created
- [ ] npm published (if applicable)
- [ ] GitHub release created

### 5.7 Implementation Summary

| Phase | Duration | Risk Level | Dependencies |
|-------|----------|------------|--------------|
| Phase 1: Foundation | 3-4 days | Medium | None |
| Phase 2: Naming & Structure | 2-3 days | Low | Phase 1 |
| Phase 3: Hook & Util Tests | 5-6 days | Medium | Phase 1 |
| Phase 4: Component Tests | 3-4 days | Medium | Phase 3 |
| Phase 5: Documentation | 1-2 days | Low | Phase 4 |
| **Total** | **2-3 weeks** | **Medium** | Sequential |

**Critical Path**: Phase 1 → Phase 3 → Phase 4

**Parallelizable**: Phase 2 can be done alongside Phase 3 (after Phase 1)

---

## 6. Testing Strategy

### 6.1 Test Types

#### 6.1.1 Unit Tests

**Target**: Hooks, utilities, pure functions

**Characteristics**:
- Fast execution (<1ms per test)
- Isolated (no external dependencies)
- Mock all side effects
- High coverage (90%+ for utils)

**Examples**:
- Hook tests: `useSignIn`, `useTwoFactorSetup`
- Utility tests: `cn`, `validateUrl`, `getAuthMethods`
- Schema tests: Yup validation schemas

**Tools**:
- Vitest (test runner)
- @testing-library/react (hook testing)

#### 6.1.2 Component Tests

**Target**: UI components (Button, Icon, Fields)

**Characteristics**:
- Test user interactions
- Test props/states
- Test accessibility
- Medium coverage (70%+)

**Examples**:
- Button: Click, disabled state, variants
- FieldPassword: Show/hide password, validation
- Switch: Toggle state

**Tools**:
- Vitest
- @testing-library/react
- @testing-library/user-event

#### 6.1.3 Integration Tests

**Target**: Form components with hooks

**Characteristics**:
- Test full user flows
- Mock SDK, not hooks
- Test error handling
- Test navigation
- Lower coverage (60%+)

**Examples**:
- SignIn: Fill form → Submit → Navigate
- SignUp: Fill form → Validate → Submit → Navigate
- TwoFactorSetup: Begin → Scan QR → Confirm → Show recovery codes

**Tools**:
- Vitest
- @testing-library/react
- @testing-library/user-event
- renderWithProvider test utility

### 6.2 Coverage Targets Per Module

| Module | Target Coverage | Priority | Notes |
|--------|-----------------|----------|-------|
| Hooks | 80%+ | High | Core business logic |
| Utils | 90%+ | High | Pure functions, easy to test |
| Components (UI) | 70%+ | Medium | Presentational, fewer edge cases |
| Components (Forms) | 60%+ | Medium | Integration tests, complex |
| Context | 70%+ | Medium | State management |
| Types | N/A | N/A | TypeScript interfaces |
| Assets | N/A | N/A | SVG files, images |

**Overall Target**: 75%+

**Exclusions** (configured in vitest.config.ts):
- `node_modules/`
- `src/test/`
- `**/*.d.ts`
- `**/*.config.*`
- `**/dist/`
- `src/main.tsx` (demo app entry)
- `src/app.tsx` (demo app)

### 6.3 Example Test Patterns

#### 6.3.1 Hook Test Pattern

**File**: `src/hooks/__tests__/use-signin.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSignIn } from '../use-signin';
import { renderWithProvider, mockPassflowSDK } from '@/test/utils';

describe('useSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('password sign in', () => {
    it('should sign in successfully', async () => {
      mockPassflowSDK.signIn.mockResolvedValue(true);

      const { result } = renderHook(() => useSignIn(), {
        wrapper: ({ children }) => renderWithProvider(children),
      });

      const payload = {
        email: 'test@example.com',
        password: 'Test123!',
        scopes: [],
      };

      const status = await result.current.fetch(payload, 'password');

      expect(status).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(mockPassflowSDK.signIn).toHaveBeenCalledWith(payload);
    });

    it('should handle error', async () => {
      mockPassflowSDK.signIn.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useSignIn());

      const status = await result.current.fetch(
        { email: 'test@example.com', password: 'wrong', scopes: [] },
        'password'
      );

      await waitFor(() => {
        expect(status).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe('Invalid credentials');
      });
    });
  });

  describe('passkey sign in', () => {
    it('should authenticate with passkey', async () => {
      mockPassflowSDK.passkeyAuthenticate.mockResolvedValue(true);

      const { result } = renderHook(() => useSignIn());

      const payload = {
        relying_party_id: 'example.com',
        scopes: [],
      };

      const status = await result.current.fetch(payload, 'passkey');

      expect(status).toBe(true);
      expect(mockPassflowSDK.passkeyAuthenticate).toHaveBeenCalledWith(payload);
    });
  });

  describe('reset', () => {
    it('should reset state', async () => {
      mockPassflowSDK.signIn.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useSignIn());

      await result.current.fetch({ email: 'test@example.com', password: 'wrong', scopes: [] }, 'password');

      expect(result.current.isError).toBe(true);

      result.current.reset();

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe('');
    });
  });
});
```

**Coverage**: Function calls, error handling, state transitions, reset

#### 6.3.2 Utility Test Pattern

**File**: `src/utils/__tests__/get-auth-methods.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getAuthMethods } from '../get-auth-methods';

describe('getAuthMethods', () => {
  it('should extract email + password methods', () => {
    const strategies = [
      { type: 'internal', strategy: { challenge: 'password', factor: 'email' } },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.email.password).toBe(true);
    expect(result.internal.email.otp).toBe(false);
    expect(result.internal.email.magicLink).toBe(false);
  });

  it('should extract phone + OTP methods', () => {
    const strategies = [
      { type: 'internal', strategy: { challenge: 'otp', factor: 'phone' } },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.phone.otp).toBe(true);
    expect(result.internal.phone.password).toBe(false);
  });

  it('should extract passkey methods', () => {
    const strategies = [
      { type: 'internal', strategy: { challenge: 'passkey' } },
    ];

    const result = getAuthMethods(strategies);

    expect(result.passkey).toBe(true);
  });

  it('should extract federated providers', () => {
    const strategies = [
      { type: 'federated', provider: 'google' },
      { type: 'federated', provider: 'github' },
    ];

    const result = getAuthMethods(strategies);

    expect(result.fim.providers).toEqual(['google', 'github']);
  });

  it('should return default structure for empty strategies', () => {
    const result = getAuthMethods([]);

    expect(result.internal.email.password).toBe(false);
    expect(result.passkey).toBe(false);
    expect(result.fim.providers).toEqual([]);
  });
});
```

**Coverage**: All branches, edge cases (empty input), return structure

#### 6.3.3 Component Test Pattern

**File**: `src/components/ui/button/__tests__/button.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../index';

describe('Button component', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click me</Button>);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render with icon when withIcon is true', () => {
    render(<Button withIcon>Button with icon</Button>);
    // Verify icon slot or className
    expect(screen.getByRole('button')).toHaveClass('with-icon'); // Example
  });

  it('should render primary variant', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('passflow-button-primary');
  });

  it('should render outlined variant', () => {
    render(<Button variant="outlined">Outlined</Button>);
    expect(screen.getByRole('button')).toHaveClass('passflow-button-outlined');
  });
});
```

**Coverage**: Props, user interactions, disabled state, variants, accessibility

#### 6.3.4 Integration Test Pattern

**File**: `src/components/form/signin/__tests__/signin.integration.test.tsx`

```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignIn } from '../index';
import { renderWithProvider, mockPassflowSDK } from '@/test/utils';

describe('SignIn integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock app settings
    mockPassflowSDK.getAppSettings.mockResolvedValue({
      auth_strategies: [
        { type: 'internal', strategy: { challenge: 'password', factor: 'email' } },
      ],
      defaults: {
        scopes: [],
        redirect: '/dashboard',
        create_tenant_for_new_user: false,
      },
    });

    mockPassflowSDK.getPasswordPolicySettings.mockResolvedValue({
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_number: true,
    });
  });

  it('should complete sign-in flow', async () => {
    mockPassflowSDK.signIn.mockResolvedValue(true);

    const { container } = renderWithProvider(
      <SignIn successAuthRedirect="/dashboard" />
    );

    // Wait for app settings
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill form
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Test123!');

    // Submit
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify API call
    await waitFor(() => {
      expect(mockPassflowSDK.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Test123!',
        scopes: [],
      });
    });
  });

  it('should display error on invalid credentials', async () => {
    mockPassflowSDK.signIn.mockRejectedValue(new Error('Invalid email or password'));

    renderWithProvider(<SignIn />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('should switch to phone number input', async () => {
    mockPassflowSDK.getAppSettings.mockResolvedValue({
      auth_strategies: [
        { type: 'internal', strategy: { challenge: 'password', factor: 'email' } },
        { type: 'internal', strategy: { challenge: 'password', factor: 'phone' } },
      ],
      defaults: { scopes: [], redirect: '/dashboard' },
    });

    renderWithProvider(<SignIn />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /use phone/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });
  });
});
```

**Coverage**: Full user flow, error handling, conditional rendering, method switching

### 6.4 Test Utilities Structure

#### 6.4.1 Test Utilities Overview

**Location**: `src/test/`

**Structure**:
```
src/test/
├── setup.ts              # Global test setup (mocks, matchers)
├── utils.tsx             # Test rendering utilities
├── mocks.ts              # Mock data (users, tokens, app settings)
└── helpers.ts            # Test helper functions
```

#### 6.4.2 Test Utilities Implementation

**`src/test/setup.ts`** (already shown in Section 3.2.2)

**`src/test/utils.tsx`**:
```typescript
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { PassflowProvider } from '@/components/provider';
import { vi } from 'vitest';

// Mock Passflow SDK
export const mockPassflowSDK = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  passwordlessSignIn: vi.fn(),
  passkeyAuthenticate: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  completeChallenge: vi.fn(),
  getAppSettings: vi.fn(),
  getPasswordPolicySettings: vi.fn(),
  beginTwoFactorSetup: vi.fn(),
  confirmTwoFactorSetup: vi.fn(),
  verifyTwoFactor: vi.fn(),
  getTwoFactorStatus: vi.fn(),
  disableTwoFactor: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
  getTokens: vi.fn(),
  getParsedTokens: vi.fn(),
  isAuthenticated: vi.fn(),
  logOut: vi.fn(),
};

// Mock Passflow constructor
vi.mock('@passflow/core', () => ({
  Passflow: vi.fn().mockImplementation(() => mockPassflowSDK),
}));

// Render with PassflowProvider
interface RenderWithProviderOptions extends RenderOptions {
  passflowConfig?: Partial<{
    appId: string;
    url: string;
    scopes: string[];
    createTenantForNewUser: boolean;
  }>;
}

export const renderWithProvider = (
  ui: ReactElement,
  options?: RenderWithProviderOptions
) => {
  const defaultConfig = {
    appId: 'test-app-id',
    url: 'http://localhost:3000',
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <PassflowProvider {...defaultConfig} {...(options?.passflowConfig || {})}>
      {children}
    </PassflowProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};
```

**`src/test/mocks.ts`**:
```typescript
import type { AppSettings, Tokens, ParsedTokens } from '@passflow/core';

export const mockAppSettings: AppSettings = {
  auth_strategies: [
    { type: 'internal', strategy: { challenge: 'password', factor: 'email' } },
  ],
  defaults: {
    scopes: ['openid', 'profile'],
    redirect: '/dashboard',
    create_tenant_for_new_user: false,
  },
  login_app_theme: {
    color_scheme: 'light',
    remove_passflow_logo: false,
    light_style: {
      primary_color: '#000000',
      text_color: '#000000',
      secondary_text_color: '#666666',
      background_color: '#ffffff',
      background_image: '',
      card_color: '#f5f5f5',
      input_background_color: '#ffffff',
      input_border_color: '#cccccc',
      button_text_color: '#ffffff',
      passkey_button_text_color: '#ffffff',
      passkey_button_background_color: '#000000',
      divider_color: '#e0e0e0',
      federated_button_background_color: '#ffffff',
      federated_button_text_color: '#000000',
      custom_css: '',
      logo_url: '',
    },
    dark_style: null,
  },
};

export const mockPasswordPolicy = {
  min_length: 8,
  max_length: 128,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: false,
};

export const mockUser = {
  email: 'test@example.com',
  username: 'testuser',
  phone: '+1234567890',
  password: 'Test123!',
};

export const mockTokens: Tokens = {
  access_token: 'mock.access.token',
  refresh_token: 'mock.refresh.token',
  expires_in: 3600,
  token_type: 'Bearer',
};

export const mockParsedTokens: ParsedTokens = {
  userId: 'user-123',
  email: 'test@example.com',
  scopes: ['openid', 'profile'],
  exp: Date.now() + 3600000,
};

export const mockTwoFactorSetupResponse = {
  secret: 'JBSWY3DPEHPK3PXP',
  qr_code: 'data:image/png;base64,...',
  issuer: 'Passflow',
};

export const mockTwoFactorConfirmResponse = {
  recovery_codes: [
    '12345678',
    '23456789',
    '34567890',
    '45678901',
    '56789012',
  ],
};
```

**`src/test/helpers.ts`**:
```typescript
import { vi } from 'vitest';

// Wait for async operations
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

// Create mock function with implementation
export const createMockFn = <T extends (...args: any[]) => any>(impl?: T) => {
  return vi.fn(impl);
};

// Create spy on object method
export const spyOn = <T extends object, K extends keyof T>(
  obj: T,
  method: K
) => {
  return vi.spyOn(obj, method);
};
```

**Usage in Tests**:
```typescript
import { renderWithProvider, mockPassflowSDK, mockAppSettings } from '@/test/utils';
import { mockUser, mockTokens } from '@/test/mocks';

// Use in test
mockPassflowSDK.signIn.mockResolvedValue(true);
mockPassflowSDK.getAppSettings.mockResolvedValue(mockAppSettings);
```

### 6.5 CI Integration

**GitHub Actions** (`.github/workflows/test.yml`):
```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run linter
        run: pnpm lint

      - name: Run tests
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Build
        run: pnpm build

      - name: Check bundle size
        run: |
          SIZE=$(du -sh dist | cut -f1)
          echo "Bundle size: $SIZE"
```

---

## 7. Appendices

### 7.1 Glossary

| Term | Definition |
|------|------------|
| @passflow/core | Core authentication SDK (TypeScript/JavaScript) |
| PassflowProvider | Root context provider for React SDK |
| Hook | React custom hook for state/logic |
| Form Component | High-level auth form (SignIn, SignUp, etc.) |
| UI Component | Low-level presentational component (Button, Icon, etc.) |
| Passkey | WebAuthn-based passwordless authentication |
| 2FA | Two-Factor Authentication (TOTP) |
| OTP | One-Time Password (6-digit code) |
| Magic Link | Passwordless authentication via email link |
| Federated Auth | OAuth login via external provider (Google, GitHub, etc.) |
| Vitest | Modern test runner for Vite projects |
| Testing Library | React testing utilities |
| Coverage | Percentage of code executed by tests |

### 7.2 File Naming Conventions

**Current Convention** (maintained during refactoring):

| File Type | Convention | Example |
|-----------|------------|---------|
| React Component | `kebab-case.tsx` | `signin.tsx`, `field-password.tsx` |
| Hook | `use-kebab-case.ts` | `use-signin.ts`, `use-app-settings.ts` |
| Utility | `kebab-case.ts` | `cn.ts`, `validate-url.ts` |
| Type Definition | `kebab-case.ts` | `index.ts` (in types/) |
| Test File | `*.test.ts(x)` | `use-signin.test.ts`, `button.test.tsx` |
| Config File | `*.config.ts` | `vitest.config.ts`, `vite.config.ts` |

**Note**: No changes to naming convention (already consistent).

### 7.3 Import Path Aliases

**Configured in `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Usage**:
```typescript
// Good: Use alias
import { Button } from '@/components/ui';
import { useSignIn } from '@/hooks';
import { cn } from '@/utils';

// Bad: Use relative paths (avoid)
import { Button } from '../../components/ui';
import { useSignIn } from '../hooks';
```

### 7.4 Dependencies Reference

**Package Versions** (after refactoring):

```json
{
  "dependencies": {
    "@passflow/core": "file:../passflow-js-sdk",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-popover": "^1.1.14",
    "clsx": "^2.1.1",
    "countries-and-timezones": "^3.8.0",
    "dayjs": "^1.11.13",
    "history": "^5.3.0",
    "lodash": "^4.17.21",
    "phone": "^3.1.59",
    "query-string": "^9.2.0",
    "react-error-boundary": "^4.1.2",
    "react-helmet-async": "^2.0.5",
    "react-hook-form": "^7.56.4",
    "react-international-phone": "^4.5.0",
    "react-otp-input": "^3.1.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-scoped-preflight": "^3.4.12",
    "yup": "^1.6.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@playwright/test": "^1.52.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/lodash": "^4.17.17",
    "@types/node": "^22.15.21",
    "@types/react": "^18.3.22",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^4.5.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "cssnano": "^7.0.7",
    "globals": "^16.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "6.30.0",
    "ts-node": "^10.9.2",
    "tsc-alias": "^1.8.16",
    "typescript": "5.8.2",
    "vite": "^6.3.5",
    "vite-plugin-dts": "^4.5.4",
    "vite-plugin-environment": "^1.1.3",
    "vitest": "^2.0.0"
  }
}
```

**Removed Dependencies**:
- `classnames` (replaced by clsx)
- `formik` (replaced by react-hook-form)
- `querystringify` (replaced by query-string)
- `@types/jest` (using Vitest)
- `@storybook/react` (no stories)
- `@storybook/react-vite` (no stories)

### 7.5 Code Quality Metrics

**Pre-Refactoring Baseline**:
- **Files**: 92 TypeScript files
- **Lines of Code**: ~6,000
- **Test Coverage**: 0% (no unit tests)
- **Bundle Size**: Unknown (needs measurement)
- **Unused Dependencies**: 6 packages

**Post-Refactoring Targets**:
- **Files**: ~92 (no change, internal restructure only)
- **Lines of Code**: ~6,500 (added tests)
- **Test Coverage**: 75%+
- **Bundle Size**: <100KB minified+gzipped (after removing deps)
- **Unused Dependencies**: 0

### 7.6 Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Requirements Analysis | `/ai-docs/sessions/dev-arch-20260109-165618-496b7c83/requirements.md` | Detailed requirements |
| Architecture Document | `/ai-docs/sessions/dev-arch-20260109-165618-496b7c83/architecture.md` | This document |
| README | `/README.md` | User-facing documentation |
| CONTRIBUTING | `/CONTRIBUTING.md` | Contributor guidelines (to be created) |
| CHANGELOG | `/CHANGELOG.md` | Version history |

### 7.7 Contacts & Resources

**Project Team**:
- Ivan Holiak ([@IvanHoliak](https://github.com/IvanHoliak))
- Jack Rudenko ([madappgang.com](https://madappgang.com))

**Resources**:
- [Passflow Documentation](https://passflow.io/docs)
- [Vitest Documentation](https://vitest.dev)
- [Testing Library Documentation](https://testing-library.com)
- [React Hook Form](https://react-hook-form.com)
- [Radix UI](https://www.radix-ui.com)

**Repository**:
- [GitHub: MadAppGang/passflow-react-sdk](https://github.com/MadAppGang/passflow-react-sdk)

---

## End of Document

**Next Steps**:
1. Review this architecture document with the team
2. Begin Phase 1 implementation (Foundation & Testing Infrastructure)
3. Track progress using the implementation plan
4. Update CHANGELOG.md as phases complete
5. Prepare for v0.2.0 release after all phases complete

**Questions?**
- Refer to requirements.md for detailed rationale
- See implementation plan for task breakdown
- Check testing strategy for test patterns
- Review risk mitigation for each phase

**Document Status**: Ready for Implementation
