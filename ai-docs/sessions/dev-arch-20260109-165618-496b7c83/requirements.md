# Requirements Analysis: Passflow React SDK Refactoring

## Executive Summary

This document outlines the requirements for improving the project structure, naming conventions, and testing coverage of the Passflow React SDK (@passflow/react). The SDK is a comprehensive authentication UI library for React applications, providing form components, hooks, and utilities for passwordless authentication, passkeys, two-factor authentication, and federated OAuth providers.

**Current State**: 92 TypeScript files, ~6,000 lines of code, comprehensive feature set, minimal testing
**Target State**: Well-structured, consistently named, thoroughly tested authentication SDK

---

## 1. Functional Requirements

### 1.1 Core Capabilities (Must Preserve)

The SDK currently provides the following capabilities that must be maintained:

#### Authentication Forms
- **SignIn**: Password, passkey, passwordless (email/phone OTP, magic link)
- **SignUp**: User registration with multiple auth methods
- **ForgotPassword**: Password recovery initiation
- **ResetPassword**: Password reset with token
- **VerifyChallengeMagicLink**: Magic link email verification
- **VerifyChallengeOTP**: OTP verification (6-digit codes)
- **InvitationJoin**: Organization invitation acceptance

#### Two-Factor Authentication
- **TwoFactorSetup**: TOTP configuration and QR code display
- **TwoFactorVerify**: 2FA verification with recovery codes
- Recovery code management

#### Hooks (Public API)
- **useAuth**: Authentication status, token management, logout
- **useSignIn**: Sign-in operations (password, passkey, passwordless)
- **useSignUp**: Registration operations
- **usePassflow**: Access to core SDK instance
- **usePassflowStore**: State synchronization with events
- **useNavigation**: Router-agnostic navigation
- **useProvider**: Federated OAuth (popup/redirect)
- **useAppSettings**: App configuration and password policies
- **useUserPasskeys**: Passkey CRUD operations
- **useForgotPassword**: Password recovery
- **useResetPassword**: Password reset
- **usePasswordlessComplete**: Passwordless flow completion
- **useLogout**: User logout
- **useJoinInvite**: Invitation acceptance
- **useAuthCloudRedirect**: Passflow Cloud redirect
- **useTwoFactorStatus**: 2FA status check
- **useTwoFactorSetup**: 2FA setup flow
- **useTwoFactorVerify**: 2FA verification
- **useTwoFactorManage**: 2FA management (disable, regenerate codes)

#### UI Components (Public API)
- **PassflowProvider**: Context provider with router integration
- **PassflowFlow**: Batteries-included routing flow
- **Button**: Styled button component
- **Icon**: Icon system
- **Link**: Styled link component
- **Switch**: Toggle switch
- **Field components**: FieldText, FieldPassword, FieldPhone
- **Dialog**: Modal/dialog component (Radix UI)
- **Popover**: Popover component (Radix UI)
- **ProvidersBox**: OAuth provider buttons

#### Utilities (Public API)
- **cn**: Tailwind class merging utility
- **isValidUrl**: URL validation
- **getUrlWithTokens**: Token injection into URLs
- **Validation schemas**: Yup schemas for forms
- **Date formatting**: dayjs utilities
- **undefinedOnCatch**: Error handling helper
- **getAuthMethods**: Extract enabled auth methods
- **Form label utilities**: i18n-ready label generation

### 1.2 Router Support (Must Maintain)

The SDK supports multiple routing libraries:
- React Router DOM (v6, v7)
- Wouter
- TanStack Router
- Browser History API (fallback)
- Hash routing
- Memory routing

### 1.3 Integration Points (Must Preserve)

- **@passflow/core**: Re-exports from core SDK (types, client)
- **Radix UI**: Dialog and Popover components
- **Formik or react-hook-form**: Form management (currently both, needs consolidation)
- **Tailwind CSS**: Scoped preflight, styling
- **Yup**: Validation schemas
- **react-international-phone**: Phone input
- **react-otp-input**: OTP input fields

---

## 2. Non-Functional Requirements

### 2.1 Maintainability

#### Code Organization
- **Clear directory structure**: Group by feature/domain, not file type
- **Consistent naming**: No typos, clear intent, follow conventions
- **Single responsibility**: Each module has one clear purpose
- **Minimal nesting**: Avoid unnecessary subdirectories (e.g., utils/cn/index.ts)

#### Developer Experience
- **IntelliSense-friendly**: Proper TypeScript types throughout
- **Discoverable exports**: Logical, predictable import paths
- **Self-documenting code**: Clear variable/function names
- **Consistent patterns**: Same approach for similar problems

### 2.2 Testability

#### Unit Testing
- **Hooks testing**: All 20+ hooks need unit tests
- **Utility functions**: All utils need pure function tests
- **Validation schemas**: Schema correctness tests
- **Error handling**: Edge case coverage

#### Component Testing
- **Form components**: User interaction tests
- **UI components**: Props, states, accessibility
- **Integration tests**: Hook + component interactions

#### Current Gap
- **0 unit tests**: Only Playwright E2E tests exist
- **No test utilities**: No test setup/helpers
- **No coverage tracking**: No baseline

#### Target Coverage
- **Hooks**: 80%+ coverage
- **Utils**: 90%+ coverage
- **Components**: 70%+ coverage
- **Overall**: 75%+ coverage

### 2.3 Bundle Size

- **Current**: Unknown (needs measurement)
- **Target**: Keep under 100KB minified+gzipped
- **Tree-shaking**: Ensure proper ESM exports
- **Peer dependencies**: Avoid bundling React, router libs

### 2.4 Performance

- **Initial load**: Fast first paint for auth forms
- **Runtime**: No unnecessary re-renders
- **Code splitting**: Support lazy loading of forms

---

## 3. Constraints

### 3.1 Backward Compatibility

**CRITICAL**: Must maintain 100% backward compatibility with existing public exports.

#### Public API Surface
```typescript
// All these exports MUST remain unchanged:
export * from './components/flow';      // PassflowFlow
export * from './components/form';      // SignIn, SignUp, etc.
export * from './components/ui';        // Button, Icon, Link, etc.
export { PassflowProvider } from './components/provider';
export * from './hooks';                // All 20+ hooks
export * from '@passflow/core';         // Re-exported types
```

#### Breaking Changes NOT Allowed
- Removing any exported component
- Renaming exported hooks
- Changing hook return types/signatures
- Removing utility functions from exports
- Changing component prop interfaces (without defaults)

#### Allowed Internal Changes
- Reorganizing internal file structure
- Renaming private modules
- Consolidating duplicate utilities
- Refactoring internal logic (same external behavior)

### 3.2 Technology Stack

#### Fixed Dependencies (Cannot Change)
- **React**: ^18.0.0 || ^19.0.0 (peer dependency)
- **TypeScript**: 5.8.2
- **Vite**: Build tool
- **Biome**: Linter/formatter (replacing ESLint/Prettier)

#### Build Outputs (Must Maintain)
- **ESM**: dist/index.es.js
- **CJS**: dist/index.cjs.js
- **Types**: dist/src/index.d.ts
- **CSS**: dist/style.css (Tailwind compiled)

### 3.3 Browser Support

- Modern browsers (ES2020+)
- WebAuthn support for passkeys (where available)
- No IE11 support required

### 3.4 Package Size Constraints

- Must remain a single npm package
- No monorepo split (maintain simplicity)
- Keep peer dependencies minimal

---

## 4. Current Issues and Technical Debt

### 4.1 Critical Issues (High Priority)

#### Typos in Filenames
**Impact**: Confusing for maintainers, hard to find, poor professionalism

1. `varify-challenge-success.tsx` → Should be `verify-challenge-success.tsx`
2. `varify-challenge-otp-redirect.tsx` → Should be `verify-challenge-otp-redirect.tsx`

**Files affected**:
- `/src/components/form/verify-challenge/varify-challenge-success.tsx`
- `/src/components/form/verify-challenge/varify-challenge-otp-redirect.tsx`

**Note**: These are internal modules, NOT exported directly, so can be safely renamed.

#### Redundant Dependencies
**Impact**: Larger bundle, confusion about which to use, maintenance burden

1. **Class merging libraries** (3 packages doing same thing):
   - `classnames` (not used anywhere)
   - `clsx` (used in cn utility)
   - `tailwind-merge` (used in cn utility)
   - **Decision needed**: Keep only `clsx` + `tailwind-merge` for cn(), remove `classnames`

2. **Form libraries** (2 packages, split usage):
   - `formik` (NOT used anywhere in src/)
   - `react-hook-form` (used in 4 form components)
   - **Decision needed**: Remove `formik`, standardize on `react-hook-form`

#### Multiple cleanup() Calls in useSignIn
**Impact**: Code smell, potential bugs, confusing control flow

```typescript
// Current code has cleanup() called 4 times:
try {
  if (type === 'passwordless') {
    const response = await passflow.passwordlessSignIn(payload);
    cleanup();  // Call 1
    return response;
  }
  cleanup();    // Call 2
  return true;
} catch (e) {
  cleanup();    // Call 3
  return false;
} finally {
  cleanup();    // Call 4 (always runs!)
}
```

**Problem**: Finally block always runs, making the other 3 calls redundant.
**Fix**: Remove cleanup() calls 1-3, keep only finally block.

### 4.2 Medium Priority Issues

#### Unnecessary Directory Nesting
**Impact**: Longer import paths, harder navigation, more boilerplate

All utilities are in subdirectories with single index.ts files:
```
src/utils/
  cn/index.ts                      # Just 4 lines
  validate-url/index.ts            # Just 6 lines
  undefined-on-catch/index.ts      # Just 5 lines
  get-app-version/index.ts         # Just 9 lines
  ...
```

**Better structure**:
```
src/utils/
  cn.ts
  validate-url.ts
  undefined-on-catch.ts
  get-app-version.ts
  ...
```

**Exception**: Keep subdirectories for multi-file utilities:
- `dayjs/` (has format.ts + index.ts)
- `validation-schemas/` (complex, may grow)

#### Storybook Without Stories
**Impact**: Storybook config exists but no .stories.tsx files

- `.storybook/` directory configured
- `@storybook/react` and `@storybook/react-vite` in dependencies
- **0 story files** found
- **Decision needed**: Either write stories or remove Storybook

#### Mixed Query String Libraries
**Impact**: Confusion about which to use

- `query-string` (modern, used in some places)
- `querystringify` (older, used in some places)
- **Decision needed**: Standardize on `query-string`

### 4.3 Low Priority Issues

#### No Unit Tests
**Impact**: Refactoring risk, bug potential, slower development

- Only Playwright E2E tests exist (4 spec files)
- No Vitest/Jest setup
- No test utilities/fixtures
- **Action**: Add Vitest + React Testing Library

#### Missing Test Framework Setup
**Current state**:
- `@types/jest` in dependencies (but Jest not installed)
- `test` script runs Playwright only
- No unit test infrastructure

**Needed**:
- Install Vitest + @testing-library/react
- Create test utilities (render with PassflowProvider)
- Set up coverage tracking
- Add test scripts

#### Inconsistent Error Handling
**Examples**:
- Some hooks throw errors
- Some hooks return error state
- Some components throw
- Some components show error UI

**Decision needed**: Define error handling strategy:
- Hooks: Return error state (current pattern for most)
- Components: Use Error Boundaries (already have withError HOC)
- Async operations: Try/catch with state

---

## 5. Assumptions

### 5.1 Refactoring Scope Assumptions

1. **No feature additions**: This refactoring does NOT add new features
2. **No API changes**: Public exports remain identical
3. **Internal only**: All changes are internal reorganization
4. **Gradual migration**: Can be done incrementally, not big-bang
5. **Test-driven**: Write tests before major refactors

### 5.2 User Base Assumptions

1. **Existing users**: SDK is in production use (v0.1.0)
2. **Import stability**: Users depend on current import paths
3. **Type stability**: Users depend on exported TypeScript types
4. **Migration burden**: Breaking changes = user churn

### 5.3 Dependency Assumptions

1. **@passflow/core stability**: Core SDK API is stable
2. **React compatibility**: React 18 & 19 remain supported
3. **Router libraries**: Current router libs won't break APIs
4. **Radix UI**: Radix components remain compatible

### 5.4 Build Assumptions

1. **Vite stays**: Continue using Vite for builds
2. **TypeScript first**: All code remains TypeScript
3. **CSS approach**: Continue using Tailwind with scoped preflight
4. **No runtime config**: All config at build/install time

---

## 6. Dependencies

### 6.1 External Package Dependencies

#### Must Keep
These packages are core to functionality and/or exposed in public API:

**Core SDK**
- `@passflow/core` - Passflow authentication SDK (local file: dependency)

**React & Routing**
- `react` (peer) - UI framework
- `react-dom` (peer) - DOM rendering
- `react-router-dom` (dev only, used in demo) - Router integration example
- `history` - Browser history management

**UI Components**
- `@radix-ui/react-dialog` - Modal/dialog primitives
- `@radix-ui/react-popover` - Popover primitives
- `react-international-phone` - Phone number input
- `react-otp-input` - OTP code input
- `react-error-boundary` - Error boundary HOC

**Form & Validation**
- `react-hook-form` - Form state management (KEEP)
- `yup` - Validation schemas

**Styling**
- `clsx` - Class name utility
- `tailwind-merge` - Tailwind class merging
- `tailwindcss-scoped-preflight` - Scoped CSS reset

**Utilities**
- `dayjs` - Date formatting
- `phone` - Phone number validation
- `countries-and-timezones` - Country data
- `query-string` - URL query parsing
- `lodash` - Utility functions
- `react-helmet-async` - Head management

#### Should Remove
Unused or redundant packages:

1. **classnames** - Not used, clsx does the same thing
2. **formik** - Not used anywhere in src/
3. **querystringify** - Replaced by query-string
4. **@storybook/\*** - Unless we add stories
5. **@types/jest** - If we use Vitest instead

#### Should Add (Testing)
New dependencies for testing:

1. **vitest** - Test runner
2. **@testing-library/react** - React component testing
3. **@testing-library/user-event** - User interaction simulation
4. **@testing-library/jest-dom** - DOM matchers
5. **@vitest/coverage-v8** - Coverage reporting

### 6.2 Internal Module Dependencies

#### Context Providers
- `PassflowContext` → Wraps @passflow/core instance
- `AuthContext` → User authentication state
- `NavigationContext` → Router integration
- `RouterContext` → React Router integration

**Dependency graph**:
```
PassflowProvider (public)
  └─ PassflowContext
       ├─ AuthContext
       ├─ NavigationContext
       └─ RouterContext
```

#### Hook Dependencies
All hooks depend on `usePassflow()` which accesses `PassflowContext`.

**Example dependency chain**:
```
useSignIn
  └─ usePassflow
       └─ PassflowContext
```

#### Component Dependencies
All form components depend on:
- Hooks (for data fetching)
- UI components (for presentation)
- Context (for app settings, navigation)

**Example**:
```
SignIn (form component)
  ├─ useSignIn (hook)
  ├─ useNavigation (hook)
  ├─ useAppSettings (hook)
  ├─ Button (UI component)
  ├─ FieldText (UI component)
  └─ FieldPassword (UI component)
```

### 6.3 Build Tool Dependencies

**Vite Plugins**:
- `@vitejs/plugin-react` - React Fast Refresh
- `vite-plugin-dts` - TypeScript declarations
- `vite-plugin-environment` - Environment variables

**TypeScript**:
- `typescript` 5.8.2
- `tsc-alias` - Path alias resolution

**Code Quality**:
- `@biomejs/biome` - Linting and formatting

**CSS Processing**:
- `cssnano` - CSS minification
- Tailwind via PostCSS

---

## 7. Success Criteria

### 7.1 Objective Metrics

1. **No breaking changes**: All existing imports continue to work
2. **Test coverage**: Minimum 75% overall coverage
3. **Bundle size**: No increase (ideally decrease by removing unused deps)
4. **Zero typos**: All filenames correctly spelled
5. **Single form library**: Remove formik, keep react-hook-form
6. **Single class utility**: Remove classnames, keep clsx+tailwind-merge

### 7.2 Qualitative Goals

1. **Easier to navigate**: Developers can find files quickly
2. **Clear patterns**: Consistent approach to similar problems
3. **Better DX**: IntelliSense, types, documentation
4. **Maintainable**: New contributors can understand structure
5. **Testable**: Easy to write and run tests

### 7.3 Non-Goals (Out of Scope)

1. **New features**: No functional additions
2. **API redesign**: No changes to hook signatures
3. **Visual redesign**: No UI/UX changes
4. **Performance optimization**: Unless trivial (e.g., remove unused deps)
5. **Documentation rewrite**: Only update if structure changes
6. **Monorepo split**: Stay as single package

---

## 8. Implementation Phases

### Phase 1: Foundation (No Breaking Changes)

**Goal**: Set up testing infrastructure and fix critical issues

1. Add Vitest + React Testing Library
2. Remove unused dependencies (formik, classnames, @types/jest)
3. Fix cleanup() redundancy in useSignIn
4. Add first unit tests for utilities (cn, validate-url, etc.)

**Validation**: Tests pass, bundle size decreases

### Phase 2: Naming & Structure (Internal Only)

**Goal**: Fix typos and flatten utils directory

1. Rename varify-* files to verify-*
2. Flatten single-file utils (cn/index.ts → cn.ts)
3. Keep multi-file utils in subdirectories
4. Update internal imports (no public API changes)

**Validation**: Build succeeds, tests pass, exports unchanged

### Phase 3: Test Coverage (Hooks & Utils)

**Goal**: Achieve 75%+ test coverage

1. Write unit tests for all hooks
2. Write unit tests for all utilities
3. Write tests for validation schemas
4. Set up coverage reporting

**Validation**: Coverage report shows 75%+

### Phase 4: Component Tests & Polish

**Goal**: Complete testing and cleanup

1. Write component tests for UI components
2. Write integration tests for forms
3. Remove Storybook if no stories added
4. Update README with testing instructions

**Validation**: All tests pass, documentation current

---

## 9. Risk Assessment

### High Risk Items

1. **Renaming files with imports**: Could break internal imports
   - **Mitigation**: Use IDE refactoring, run build after each change

2. **Removing dependencies**: Could break if used indirectly
   - **Mitigation**: Search codebase for package usage first

3. **Test setup**: May reveal existing bugs
   - **Mitigation**: Fix bugs as found, not breaking changes

### Medium Risk Items

1. **Flattening utils structure**: Many import path changes
   - **Mitigation**: Update exports in utils/index.ts carefully

2. **Coverage targets**: May be hard to reach
   - **Mitigation**: Start with low-hanging fruit, iterate

### Low Risk Items

1. **cleanup() fix**: Clear bug, simple fix
2. **Typo fixes**: Internal files, no exports
3. **Dependency removal**: Already confirmed unused

---

## 10. Open Questions

### Questions for Decision

1. **Storybook**: Keep and add stories, or remove entirely?
   - **Recommendation**: Remove if no stories in 2 weeks

2. **Test framework**: Vitest vs Jest?
   - **Recommendation**: Vitest (better Vite integration, faster)

3. **Query string library**: Standardize on query-string?
   - **Recommendation**: Yes, remove querystringify

4. **Error boundary approach**: All forms wrapped?
   - **Current**: PassflowFlow uses withError HOC
   - **Recommendation**: Keep current approach, document pattern

5. **lodash usage**: Keep full lodash or use lodash-es?
   - **Action needed**: Audit actual usage, use named imports

### Questions for Validation

1. Are there any other router libraries we should support?
2. Are there plans to add more auth methods (FIDO2, WebAuthn L3)?
3. What's the target browser support matrix?
4. Are there specific bundle size targets?

---

## 11. Appendix: File Structure Analysis

### Current Directory Structure

```
src/
├── assets/                    # Static assets
├── components/
│   ├── error/                 # Error boundary component
│   ├── flow/                  # PassflowFlow (all-in-one)
│   ├── form/                  # Auth form components (12 subdirs)
│   ├── passkey/               # Passkey management UI
│   ├── provider/              # PassflowProvider
│   └── ui/                    # Reusable UI components (11 subdirs)
├── constants/                 # App constants (formats, countries)
├── context/                   # React contexts (7 files)
├── hocs/                      # Higher-order components (withError)
├── hooks/                     # Custom hooks (22 hooks)
├── styles/                    # Tailwind CSS
├── types/                     # TypeScript types
└── utils/                     # Utility functions (12 subdirs)
    ├── cn/index.ts            # 4 lines → flatten to utils/cn.ts
    ├── dayjs/                 # Keep (2 files)
    ├── get-app-version/       # 9 lines → flatten
    ├── get-auth-methods/      # 100 lines → keep as file
    ├── get-form-labels/       # 60 lines → keep as file
    ├── get-url-errors/        # 11 lines → flatten
    ├── get-url-with-tokens/   # 17 lines → flatten
    ├── undefined-on-catch/    # 5 lines → flatten
    ├── url-params/            # 80 lines → keep as file
    ├── validate-url/          # 6 lines → flatten
    └── validation-schemas/    # Keep (may grow)
```

### Proposed Directory Structure (Utils)

```
src/utils/
├── cn.ts                      # Flatten from cn/index.ts
├── validate-url.ts            # Flatten from validate-url/index.ts
├── undefined-on-catch.ts      # Flatten from undefined-on-catch/index.ts
├── get-url-errors.ts          # Flatten from get-url-errors/index.ts
├── get-url-with-tokens.ts     # Flatten from get-url-with-tokens/index.ts
├── get-app-version.ts         # Flatten from get-app-version/index.ts
├── get-auth-methods.ts        # Flatten from get-auth-methods/index.ts
├── get-form-labels.ts         # Flatten from get-form-labels/index.ts
├── url-params.ts              # Flatten from url-params/index.ts
├── dayjs/                     # Keep (multi-file)
│   ├── format.ts
│   └── index.ts
├── validation-schemas/        # Keep (may grow)
│   └── index.ts
└── index.ts                   # Update exports
```

**Impact**: Simpler imports, easier navigation, same exports.

---

## Document Metadata

- **Version**: 1.0
- **Date**: 2026-01-09
- **Author**: AI Architect
- **Project**: Passflow React SDK
- **Session**: dev-arch-20260109-165618-496b7c83
- **Stack**: TypeScript/React/Vite
- **Status**: Ready for Review
