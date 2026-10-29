# Changelog

All notable changes to `@passflow/react` are documented in this file.

## [0.13.0] - 2026-10-30

### Added

- Every sign-in path reaches the 2FA screen when the server asks for a second factor: sign-up, password reset, the typed OTP and the emailed link join sign-in's password and passkey paths, and `PassflowProvider` sends a federated landing that carries `#tfa_token=` there too. The route is the mounted flow's own, or the new `twoFactorVerifyPath` prop on `PassflowProvider`, `SignUp`, `VerifyChallengeOTP` and `ResetPassword`. A signed-in user who opens a `#tfa_token=` link stays where they are.
- A "Trust this device" switch on the 2FA verify and recovery forms, off by default and labelled through `trustDeviceLabel`. Ticked, the server trusts the browser, and its later sign-ins skip the second factor while the app trusts devices.
- `useTwoFactorVerify().verify(code, options?)` and `.useRecoveryCode(code, options?)` take `{ trustDevice }`.
- `useTrustedDevices()` lists the user's trusted devices on the app and revokes one.
- `Button` gains a `link` variant, which the 2FA forms' "use a recovery code" links now use; `Switch` gets its Storybook stories.

### Changed

- Requires `@passflow/core` 0.18.0 or later, up from 0.17.0.

Needs a server that asks for the second factor on every sign-in path and sets trusted-device cookies (Passflow `src/v0.18.0`).

## [0.12.0] - 2026-10-29

### Added

- The device verification page asks for a second factor when the CLI's app requires one. `/oidc/device/authenticate` says so with `second_factor_required` and `second_factor_methods`, and that ticket can no longer approve. The page asks for an authenticator code, or a recovery code instead, posts it to `/oidc/device/second-factor`, and approves with the ticket that answers, which records both factors. A consent tap and the passkey mode approve straight after the factor; full login lands on the usual approval screen.
- `useDeviceVerify` gains a `second_factor` status, `isSecondFactorPending`, `secondFactorMethods` and `submitSecondFactor`.
- A `second-factor` `LoginScreen` state, with a catalogued Storybook story for entering a code, checking it, and a wrong code. It uses the sign-in's own two-factor copy and switches between an authenticator code and a recovery code.
- The device error taxonomy gains `second_factor_invalid` and `missing_second_factor`, each with the page's own copy.

Needs a server that sends `second_factor_required` (Passflow `src/v0.16.1`). Against an older server the page behaves as in 0.11.0.

## [0.11.0] - 2026-10-28

### Changed

- Requires `@passflow/core` 0.17.0 or later, up from 0.15.0. Nothing in this package's own code changed for it — `useUpgrade`, `UpgradeProvider` and `UpgradeDialog` behave exactly as in 0.10.0, and the one core symbol the provider imports as a value, `requiredAcrLevel`, is unaffected.

### Removed

- Twenty-eight names are no longer re-exported. `src/index.ts` carries `export * from '@passflow/core'`, so this package republishes core's entry surface; core withdrew these across 0.16.0 and 0.17.0, and they therefore leave this package's surface too. The published entry goes from 184 exported names to 156.

  Sixteen upgrade assembly functions, none of which a consumer was meant to call — the step-up flow is driven through `passflow.upgrade` and this package's `useUpgrade`:
  `attachUpgradeAuth`, `barOf`, `coreOutcomeToError`, `createUpgradeClient`, `createUpgradeFacade`, `handleChallenge`, `mergeChallenges`, `parseAcrToken`, `parseMaxAge`, `planReplay`, `readAcrValues`, `readUpgradeChallenge`, `settleAxiosOutcome`, `settleFetchOutcome`, `tagUpgradeOutcome`, `upgradeFetch`.

  Twelve types that only those functions produced, so no public API could hand a consumer a value of any of them:
  `ChallengeContext`, `ChallengeInput`, `ChallengeReadOptions`, `ChallengeReading`, `CoreOutcome`, `InterceptionScope`, `MaxAgeReading`, `ReplayHints`, `ReplayPlan`, `Settlement`, `UpgradeFacadeDeps`, `UpgradeInterceptorOptions`.

  `ChallengeChannel` and `UpgradeSessionPin` were part of that second group until review found each is still exposed by a public signature — `UpgradeChallenge.channels` and `AuthService.readSessionPin()` — so both remain exported. Everything the step-up UI needs is unchanged: `classifyUpgradeError`, `requiredAcrLevel`, the `isUpgrade*` predicates, the error classes, `UpgradeChallenge`, `UpgradeFacade` and the factor types.

## [0.10.0] - 2026-10-28

### Added

- `UpgradeDialog`, the UI for an assurance upgrade (step-up authentication). A request answered with an RFC 9470 challenge elevates the session and replays itself; this is what the user sees while that happens. It is a library component with a catalogued Storybook story per supported state, including the terminal ones: attempts exhausted, a session changed under the user, a retryable transport failure versus a final one, and an elevation that succeeded only to be challenged again.
- `useUpgrade` and `UpgradeProvider`. The provider wires the dialog to a configured `Passflow` instance and requires `@passflow/core` 0.15.0 or later; the hook reads the context and installs nothing, so a host rendering its own prompt can use it alone. A cancelled prompt resolves `null` rather than throwing.
- `Spinner`, with its own story.
- A `description` prop on the `option` button variant, exposed as an accessible description rather than folded into the name.

### Fixed

- The `option` button folded its hint into the accessible name, which read `"Authenticator appEnter the code from your app"`. The name is now pinned to the label through `aria-labelledby`, with the hint exposed through a merged `aria-describedby`.
- Eight Storybook accessibility audits were scoped to `#storybook-root`, which Radix's `Dialog.Portal` leaves empty and marks `aria-hidden`. They had been passing vacuously, auditing nothing at all. They now scope to `[role="dialog"]` and fail on an empty render.
- `pnpm test` no longer fails with `browserType.launch: Executable doesn't exist` after a `@playwright/test` bump. The script installs its browser first, which costs under a second when one is already present.

### Removed

- `upgrade-required-placeholder.tsx`, the internal stand-in the real dialog replaces. It was never exported from the package entry.

## [0.9.1] - 2026-10-26

### Fixed

- The consent screen no longer auto-focuses Allow. Pressing Enter on a freshly loaded `ConsentFlow` previously granted every requested scope; neither button takes initial focus now, so Deny stays a true peer of Allow.

## [0.9.0] - 2026-10-26

### Added

- `ConsentFlow`, the OIDC consent screen as an SDK flow. Mount it on `/web/consent`; it composes the same `LoginScreen` as sign-in, so consent no longer drifts from the rest of the hosted pages. It is standalone and needs no `PassflowProvider`: the staged request is addressed by `parent_challenge_id` on the URL and read with a same-origin cookie.
- `useConsent` and its types (`UseConsentProps`, `ConsentStatus`, `ConsentInfo`, `ConsentError`, `ConsentScopeMetadata`) for hosts that render their own consent UI. Decisions carry the server's CSRF token and honour both `query` and `form_post` response modes.
- A `consent` state on `LoginScreen` (`LoginConsentState`, `LoginConsentScope`): per-scope switches that all start granted, with Allow and Deny as peer actions.

### Fixed

- `Switch` now generates a unique input id. Every instance previously used the id `switch`, so with more than one on a page each label resolved to the first input and clicking a later row toggled the first. Pass `id` to override.

## [0.8.3] - 2026-08-19

### Removed

- The dead first-generation CLI authentication UI: the `cli-browser-auth`, `cli-qr-auth`, and `cli-auth` form components and the `useCLIAuth` hook, along with their exports and the `cli_browser` / `cli_qr` routes. They drove the server's superseded `/cli/auth` flow, whose completion endpoint was disabled server-side as a token-injection risk, so the UI could not complete a login. CLI authentication is served by the RFC 8628 device verification flow (`DeviceVerifyFlow` / `useDeviceVerify`), which is unaffected.

## [0.8.2] - 2026-08-19

### Fixed

- `PassflowFlow` no longer gates its first render on a peer-dependency check that could never fail. The check dynamically imported `react-router-dom` to detect a missing install, but the same module is imported statically, so an absent dependency fails at module load and the handler was unreachable. Consumers previously rendered an empty first paint while the check resolved; that render is gone, along with the `INEFFECTIVE_DYNAMIC_IMPORT` build warning.

## [0.8.1] - 2026-07-28

Version 0.8.1 is the first registry release after 0.7.1 and includes the previously unreleased 0.8.0 device-verification work.

### Added

- A typed, Storybook-backed `LoginScreen` component system covering credential, passkey, code-entry, invitation, device-approval, status, and general-error states.
- RFC 8628 device verification through `DeviceVerifyFlow`, `useDeviceVerify`, typed device errors, and explicit device approval screens.
- Shared CLI browser and QR authentication state mapping through the component library.
- Bundled country flags and an improved international phone field with no runtime dependency on third-party flag assets.
- Storybook accessibility tooling and Playwright coverage for authentication states, interactions, responsive layouts, themes, and accessibility.
- Typed authentication error classification and shared login-theme and invitation-chrome mapping utilities.

### Changed

- Sign-in, sign-up, invitation, CLI authentication, device verification, passwordless verification, and error screens now consume the shared UI component library instead of maintaining flow-local visual implementations.
- Authentication styling now resolves through the existing `--passflow-*` design tokens, with Storybook serving as the supported-state catalog.
- Build, Storybook, Vitest, Playwright, Vite, and pnpm tooling were upgraded and aligned with CI.
- The npm package now rebuilds during `prepack` and excludes demo, test, Storybook, and Playwright declarations from the published artifact.

### Fixed

- OIDC credential flows no longer cancel the relying party callback with a competing post-login navigation after the interceptor has followed `redirect_url`.
- Sign-in and sign-up user-facing errors no longer expose raw backend or redirect details.
- Password, phone, icon, switch, provider, focus, loading, and validation states received accessibility and interaction fixes.

[0.8.2]: https://github.com/MadAppGang/passflow-react-sdk/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/MadAppGang/passflow-react-sdk/compare/v0.7.1...v0.8.1
