# Changelog

All notable changes to `@passflow/react` are documented in this file.

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
