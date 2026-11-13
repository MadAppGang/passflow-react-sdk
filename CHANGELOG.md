# Changelog

All notable changes to `@passflow/react` are documented in this file.

## [0.25.2] - 2026-11-11

### Fixed

- A passkey prompt that never answers no longer locks the sign-in form. Some passkey providers (the 1Password extension) leave the browser's passkey request pending for good after the user dismisses their prompt. They ignore the WebAuthn timeout and an `AbortSignal`, and the form stayed on "Signing in…" with every control disabled. While a passkey request is in flight, the progress now offers Cancel. It returns to the form with "Passkey sign-in was cancelled.", and `useSignIn` ignores that request's late result. A late success is still the user's own sign-in, and `@passflow/core` may complete it. `useSignIn` adds `cancelPasskey()` and `pendingOperation`, and `LoginProgress` takes an optional `onCancel`.
- The "check your email" screen after a magic link is sent said "confirm your registration" during sign-in too. It now says "Open the link to continue."

## [0.25.1] - 2026-11-09

### Fixed

- On the hosted login the step-up dialog never opened. The provider rebuilds its `Passflow` instance when app settings change the scopes, and the session exchange kept the first instance, whose `hostedUpgrade` was never enabled. The app received `unmet_authentication_requirements` instead of the user being asked for a second factor. The exchange now steps up on the current instance.

## [0.25.0] - 2026-11-09

### Changed

- Requires `@passflow/core` ^0.30.1 (was ^0.29.0), for `passflow.hostedUpgrade`.
- Under an OIDC parent (`parent_challenge_id` in the URL) the provider always calls `/auth/session/exchange`, with the hosted session cookie only: it sends no `Authorization` header and refreshes no stored token first. The `prompt=login` and stored-token `max_age` checks the SDK made before the exchange are removed; the server judges the hosted session and answers 403 when it falls short.
- Exchange answers: 401 or 400 shows the sign-in form (`login_required` to the app under `prompt=none`). A 403 under `prompt=none` sends `interaction_required` to the app. A 403 naming `acr_values` or `max_age` opens the step-up dialog on `passflow.hostedUpgrade` and retries the exchange once; if the step-up is cancelled or fails, the app gets `unmet_authentication_requirements` when `acr_values` was asked, and the sign-in form shows when only `max_age` was. A 403 naming neither shows the sign-in form.
- Errors sent to the app follow the request's `response_mode`: a query-string redirect, or a POST form for `form_post`.
- While the step-up dialog is open under a parent, the "continuing" status shows behind it instead of the sign-in form.

### Added

- `{ form_post: { action, fields } }` answers from auth endpoints and the exchange are submitted as a hidden POST form, so apps registered with `response_mode=form_post` receive their code.
- `UpgradeProvider` prop `facade`: the upgrade facade to install and elevate through (default `passflow.upgrade`). `PassflowProvider` passes `passflow.hostedUpgrade` under a parent challenge, turns the upgrade dialog on there, and does not patch `fetch` for it.

## [0.24.0] - 2026-11-09

### Changed

- Fonts ship with the package. `style.css` no longer imports Google Fonts: Inter (variable, opsz and weight axes) and Gasoek One are served from `dist/fonts/` by relative `url()`, so a bundler that processes CSS (Vite, webpack) emits them on the app's own origin. No request goes to `fonts.googleapis.com` or `fonts.gstatic.com`, and a Content-Security-Policy needs only `font-src 'self'`. The family names are unchanged. Gasoek One ships its Latin subset only; it renders the "Secured by PASSFLOW" mark.

## [0.23.0] - 2026-11-08

### Changed

- Requires `@passflow/core` ^0.29.0 (was ^0.28.0). Its `authRedirect()` is now async and follows the app's mode: in SDK mode hosted sign-in returns an authorization code, which core redeems with PKCE. Core accepts URL tokens only for apps in Simple mode.
- After a sign-in that leaves for an external target, the hosted login reads the app's mode from `getAppSettings()`. A Simple-mode app gets its tokens in the URL fragment. An SDK-mode app, or an app whose settings don't say Simple, is sent to the address with nothing in it. If the settings can't be read, the screen shows "unavailable" with a retry, and nothing is sent.
- New `PassflowProvider` prop `handOff: { scopes?, state? }`: the scopes and `state` the app asked for when it opened the hosted login. In Simple mode `refresh_token` goes to the app only when those scopes include `offline` or `offline_access`, and `state` is echoed in the fragment. Without `handOff`, `getUrlWithTokens` returns every stored token, as before.
- A federated sign-in start carries `parent_challenge_id` from the page URL. In Simple mode it also carries the app's `state` and asks for the app's scopes. In SDK mode it asks for the sign-in scopes.
- Email-link approval is one click: the approval page shows the app and where and when the sign-in started, with "Sign in" and "This wasn't me" equally prominent. There is no code to type, and the waiting tab shows none. This needs the matching Passflow server, which accepts an approval without a code. `LoginPasswordlessWaitingState.matchCode` is removed, and `LoginPasswordlessApprovalFormState.onApprove` takes no argument.
- A waiting tab under an OIDC sign-in follows the `redirect_url` its status poll returns.

### Added

- The provider takes hosted sign-in code landings (`SignIn` source `oidc-landing`) and applies their tokens to the live instance. A refused landing (`Error` op `oidc.redirect`) sets `federatedLandingOutcome` to `'failed'`.
- A landing with `#access_token=` in the fragment is recognised and waits for the app id, like `?access_token=`.

### Fixed

- The sign-in page could render empty when app settings arrived while the app id was still being discovered, or when a late settings write overwrote values set meanwhile.
- The provider no longer rebuilds its `Passflow` instance when settings arrive or when the scopes are recomputed to the same set. `keyStoragePrefix`, `tokenExchange`, `platform`, `refreshCoordination` and `refreshStrikes` are read when the provider mounts.
- `useAuthCloudRedirect` no longer leaves an unhandled promise rejection. Failures arrive as an `Error` event.
- The hosted session exchange refreshes an expired access token before it asks for a code, so silent sign-in keeps working after the access token expires.
- A `#tfa_token` landing makes no session-exchange request. Under an OIDC sign-in it shows the second-factor screen even when a hosted session already exists.

## [0.22.0] - 2026-11-08

### Changed

- The consent page reads `consent_challenge_id` from its URL, where it used to read `parent_challenge_id`. It needs a Passflow server that sends `consent_challenge_id` in the consent link. Against an older server it shows "Invalid consent link".

## [0.21.0] - 2026-11-07

### Changed

- Requires `@passflow/core` ^0.28.0 (was ^0.26.0). Its exports, re-exported here, now include `SERVICE_UNAVAILABLE_ERROR_ID` and `SERVICE_UNAVAILABLE_MESSAGE`.
- When Passflow cannot be reached, or its gateway answers 502, 503 or 504, every sign-in screen now shows "Passflow is temporarily unavailable. Please try again in a moment." This covers sign-in and sign-up, the emailed code, the approve screen, the passwordless completion, the new password screen, invitations and the redirect check. Those screens used to show their own copy for a network failure. On the emailed code that copy asked the user to go back and start again.
- Tokens a federated sign-in returns in the URL (`?access_token=`) are now verified by core before they are saved, against the server's published keys and the app id. The provider takes them once the app id is known, so a hosted login that discovers its app still ends on "You're signed in". A token that fails verification leaves the sign-in form and saves nothing.

## [0.20.3] - 2026-11-05

### Fixed

- Resending an email link or OTP now keeps the invite from the first attempt. An invite-only app refused the resend for a new user.
- Resending an email link now asks for a tenant when the first attempt did. It used to ask for none.
- Forgot password with a username now reaches its success screen, and its resend goes by username. The screen used to show an error after the reset had been sent.
- The forgot-password success screen names the identity just submitted, not an `email` or `phone` left in the page URL.
- An opened email link sends its completion once under React StrictMode. It used to send it twice in development.
- An opened email link or a reloaded waiting tab that owes a second factor now stays in the flow on a hash router or under a path prefix. A provider-level `twoFactorVerifyPath` now also applies to the OTP screens.

## [0.20.2] - 2026-11-05

### Fixed

- Email link, OTP and forgot-password no longer fail to start on an app that doesn't list the server's default redirect in its redirect URLs. These calls, along with passkey sign-up and the OTP resend, now name an address only when the request gave one (`successAuthRedirect`, `successResetRedirect`).
- An opened email link whose answer is the sign-in page now shows "You're signed in". It used to treat that page as another address, which sent the user back to the sign-in form or showed an error.

### Changed

- With no target given, an email link, OTP or password reset now ends where the server's answer says: the app's first registered redirect URL, or the server's default if the app has none. Put the URL you want first in the list. This changes the ending for an app that lists the server's default with another URL ahead of it: users now go to that first URL. A tab waiting for its link to be approved ends on the default redirect from the app's settings.
- A `redirect_url` left on the sign-in, sign-up or forgot-password page URL is no longer carried into the attempt. Pass `successAuthRedirect` or `successResetRedirect` instead.

## [0.20.1] - 2026-11-05

### Fixed

- A federated sign-in that owes its second factor no longer ends on a bare 404 on the hosted login. The federated return carries `#tfa_token=` and no `appid`, so the provider ran app-id discovery: that held back the flow, so the landing navigated to the unprefixed `/two-factor-verify`, and it picked the default login app, under which the server refuses the token. On a page served by the API's own origin, with no app id configured, the provider now takes the app from the token's `aud` and skips discovery. It also adds `appid` to the 2FA URL, so a reload keeps the app. An `appId` prop still wins, and any other page behaves as before.
- A sign-in with nowhere to go now says so. When the target is the sign-in page itself, or there is no target, the user sees "You're signed in" and stays, with no tokens in the address bar, instead of landing back on the sign-in form as if it had failed. This covers sign-in, sign-up, magic link, OTP, 2FA, invitation and password reset endings, and a federated landing on the login page, with or without PKCE. Any other target still gets the redirect.

### Changed

- Validate the redirect target before completing sign-in. Sign-in now goes through `checkRedirectUrl` before it leaves for a full URL passed in `successAuthRedirect`, and an error screen appears if that fails. Add the URLs you pass to the app's redirect URLs. Requires `@passflow/core` 0.26.0 and a server with `POST /auth/redirect/check`.
- "Go back" on the error screen now only follows a path on the current origin. Any other target goes to `/`.
- The 2FA finished screen now reads "You're signed in", and the old "Successful verification! But there is no redirect URL" screen is gone.

## [0.20.0] - 2026-11-05

### Breaking

- The server must have the enrolment route (`GET /auth/2fa/enrollment`) before an app takes this version. A server without it answers 404, and every 2FA sign-in stops at "We could not continue your sign-in. Try again."
- Removed props: `signInPath` on `TwoFactorVerifyForm` and `TwoFactorRecoveryForm` (use `onBackToSignIn`), `twoFactorSetupPath` on `TwoFactorVerifyForm` and `TwoFactorVerifyFlow`, `useV2Flow` on `TwoFactorVerifyFlow`.
- Removed fields: `retryCountdown` on `useTwoFactorSetupMagicLink`'s return, `shouldAutoRedirect` on `TwoFactorError`.
- The wrapper classes `passflow-2fa-verify`, `passflow-2fa-recovery` and `passflow-2fa-setup` are gone, so custom CSS on them stops matching. These screens now render through `LoginScreen`.
- `TwoFactorSetupForm` no longer resets after `onComplete` when you pass one.

### Added

- First-time 2FA enrolment on the verify screen. The screen reads the server's enrolment state before asking for a code, then shows one of: the code entry, for an enrolled user; an emailed setup link, sent only on a tap with up to three sends; setup on the spot, with QR, secret, code and recovery codes, finishing with the same code; or "contact your administrator".
- `LoginScreen` states `two-factor-code`, `two-factor-setup` and `two-factor-recovery-codes`, each with Storybook stories. `LoginStatus` gains a secondary action, a busy primary action, an error line and a `working` tone. Also exported: their types, `signInSearch` and `isTerminalTwoFactorError`.
- `onEnded` and `onBackToSignIn` on `TwoFactorVerifyForm` and `TwoFactorRecoveryForm`, `onBackToSignIn` on `TwoFactorSetupForm`, and the `rate_limited` type on `TwoFactorErrorType`.

### Changed

- Requires `@passflow/core` `^0.25.0`.
- The setup link page uses the same look as direct setup and calls only what a link session may call. A used link says so and offers sign-in. Link error screens have the heading "We could not open this link".
- The sign-in search (`appid`, `parent_challenge_id`) now carries across the second factor screens, without attempt secrets such as `otp` or `token`.
- `.passflow-button--clean` has a transparent background, not white, so its text can be read in the dark theme.
- Code boxes narrow to fit their container, so six-digit boxes are 47.67px wide rather than 48px.

### Fixed

- The dead Set Up 2FA link on the verify screen is gone. It left a new user on a required app with no way forward.
- Eight-digit TOTP codes no longer run past the card.
- A rate limit on any of these screens shows its own message, not the server's fixed "15 minutes" text.
- A verify or recovery form whose sign-in has ended now says so and offers sign-in. Its "Redirecting to sign in..." message never redirected.
- `TwoFactorChallenge` sends one challenge under React StrictMode, not two, so it no longer spends two of the three budget units.

## [0.19.0] - 2026-11-04

### Added

- Cross-device magic-link sign-in. With PKCE on, the tab that asked for the link shows a 4-digit code and finishes sign-in itself once the link is approved. The device that opens the link shows the request details, asks for that code, and offers Approve and Deny. Resend replaces the request, and the tab waits on the new one.
- `federatedLanding` prop on `Passflow` (`'app'` by default, or `'login-page'`). With `'login-page'`, PKCE on and no `parent_challenge_id`, a federated sign-in returns to the login page, which finishes it and forwards to the app with tokens, once. `useProvider` takes the same value as its third argument.
- `federatedLandingOutcome` on `NavigationContext`: `'signed-in'` or `'failed'` after a federated landing.
- `LoginScreen` states `passwordless-waiting` and `passwordless-approval`, each with Storybook stories. Also exported: the `FederatedLanding` and `FederatedLandingOutcome` types, and the approval message helpers from the utils.

### Changed

- Requires `@passflow/core` `^0.24.0`.
- Federated PKCE landings now run from a committed effect through core's `deferFederatedLanding`, so they hold under React 18 StrictMode.

### Fixed

- A refused parent challenge (`error.auth.flow.parent.expired`, `.not.found`, `.completed`) shows its own message on the form instead of marking the credential fields invalid. Start again reloads the page without `parent_challenge_id`.
- `match_code` from a passwordless start is no longer put in the query of the verify screen.

## [0.18.0] - 2026-11-03

### Added

- Email verification code step. When an app's registration policy requires a verified email, `/auth/register` and `/auth/login` may answer with a challenge instead of tokens. Sign-up and sign-in then show a code screen bound to that challenge. The submitted code goes to `/auth/validate`, and its answer continues the flow as before: second factor, PKCE or redirect. Resend repeats the original request. Cancel goes back to the form.
- When the server's code budget is spent and it emails a link instead, the flow shows a "check your email" screen with no code input. The link opens the reset-password screen with a continuation grant. That screen titles itself "Create your password" and signs the user in with the tokens `/auth/password/change` returns.
- `useEmailCodeStep()` (with `UseEmailCodeStep` and `UseEmailCodeStepOptions` types) drives the code step for custom UIs. Also exported: `EmailCodeStep`, `EmailVerificationStep`, `readEmailVerificationStep`, `emailCodeStepReducer`, `initialEmailCodeStepState`, and the error helpers `authErrorFrom`, `authRedirectErrorFrom`, `invitationJoinErrorFrom`, `emailCodeErrorMessage`, `newPasswordErrorMessage`, `serverMessageFor` and `isPasswordSavedRateLimit`.
- `LoginScreen` states `email-code` and `new-password`, and an `info` tone for the `status` state, each with a Storybook story.
- `Button` honours `aria-disabled`: it looks disabled and ignores clicks but stays focusable, so focus is not lost while a resend cooldown runs.

### Changed

- Requires `@passflow/core` `^0.22.0`, which adds `verifyEmailCode` and the `EmailVerificationRequired` event.
- For these error ids the forms show the server's localized `error.message` instead of fixed copy: `error.registration.email.domain_not_allowed`, `email.required`, `email.not_verified_by_provider`, `error.invite.email.domain_not_allowed`, `error.verification.code.rate_limited`, and wrong, expired or used codes. The same list applies to errors that arrive in the URL from a federated sign-in. Other ids keep the fixed copy.
- The reset-password screen is built on `LoginScreen`. Its outer wrapper class is unchanged, but the elements inside it are different, so `custom_css` rules aimed at its inner classes need updating.

### Fixed

- A 429 from the server is recognised whether core passes it on as a `PassflowError` or as a raw HTTP error, so rate limits show the rate-limit message instead of a generic failure.
- A URL error message containing a literal `%` no longer breaks decoding.

## [0.17.0] - 2026-11-03

### Changed

- Requires `@passflow/core` `^0.21.0`: one token refresh per browser across tabs, with transient failures kept apart from the end of a session. See core's `docs/token-refresh.md`, "Migrating from 0.20.1". What reaches React apps: a network error or 5xx during refresh no longer signs the user out; `SessionExpired` fires only at a real end; `SignOut` fires once per sign-out.
- `SessionExpiredReason` is core's type, re-exported from the package root as before. It adds `'successor_timeout'` and `'identity_changed'`, so `useSessionExpired` and `AuthProvider`'s `onSessionExpired` can receive them. An exhaustive `switch` over the reason needs the new cases.

### Added

- `useRefreshStatus()` returns `{ isFailing, since, nextRetryAt }` while token refresh is failing transiently (`RefreshFailing` until `RefreshRecovered`), for a "reconnecting" notice. Call it in a component that lives as long as the app: a component that mounts mid-episode starts idle.

### Fixed

- `PassflowProvider` disposes the `Passflow` instances it replaces (its state changes on app ID discovery and app settings) and the one it holds on unmount. From core 0.21 each instance holds refresh timers, a `BroadcastChannel` and Web Locks, so an undisposed one went on acting as another tab.

## [0.16.0] - 2026-11-03

### Breaking

- `react-router` is no longer a peer dependency, and the package does not import it. The only peers are `react` and `react-dom`, `^18 || ^19`. `PassflowFlow` keeps its own small router, so it works the same in an app that routes with React Router, TanStack Router, Wouter, another router, or none. A host that installed `react-router` only for this package can remove it.
- `PassflowFlow` no longer picks up a host React Router `<Router>`, and the console warning about `routerType` inside one is gone. Inside an app router in browser mode it shares the address bar with it: each side sees the other's navigations, and Back reaches both. Mount it on a catch-all route (`/auth/*` in React Router, `/auth/$` in TanStack Router, `<Route path="/auth" nest>` in Wouter).
- `pathPrefix` is an absolute path from the root of the URL. When it is not given, the flow takes it from the first URL it sees, so `<PassflowFlow />` on `/auth` or `/auth/signin` uses `/auth`. Before, inside a host router, it was relative to the parent route.
- `TwoFactorSetupMagicLinkFlow` no longer uses React Router's `useParams`. It reads the token from the URL segment after `/two-factor-setup-magic-link/`, or from a new `token` prop.

### Added

- `<PassflowFlow />` with no props works: browser history, prefix from the URL, every screen at a fixed path under it (`/signin`, `/signup`, `/verify-challenge-otp`, `/two-factor-setup-magic-link/:token`, …).
- Full control: pass `location` and `navigate` together and the app's router owns the location, for example a TanStack Router memory history. Their types are exported as `PassflowFlowLocation` and `PassflowFlowNavigate`.
- `PassflowFlow` serves the 2FA setup magic link (`/two-factor-setup-magic-link/:token`) as one of its screens.

### Fixed

- Forms inside `PassflowFlow` read search params from the flow's location. In memory or hash mode, or under `location` + `navigate`, they read the address bar, which never carried them; forgot-password then threw "Invalid default method param".

### Internal

- Tests run the zero-config flow inside React Router, TanStack Router and Wouter (jsdom), and inside a TanStack Router app in Chromium. `@tanstack/react-router` and `wouter` are dev dependencies; `react-router` stays one, for those tests and the docs.
- The consumer type check installs no router.

## [0.15.1] - 2026-11-02

### Fixed

- `PassflowFlow` navigates through its own router whatever the provider's `router` prop says. With the default value, every step inside the flow did a full page load through `window.location` to an unprefixed path, leaving a memory, hash or host router. Hosts that pass `router="react-router"` were not affected.
- A navigation asked for with `replace: true` inside `PassflowFlow` replaces the history entry. It pushed a new one, because `replace` was handed to React Router as part of the destination.
- The passwordless OTP screen and the 2FA verify form name the code field with a visible "Verification code" label. They used hidden text only, which fails WCAG labelling (axe `label-title-only`) once a wrong code shows an error.

### Added

- `FieldOtp` takes an optional `label`: the field then draws its own visible label above the boxes. `labelledBy` still works; a field takes one or the other. New stories: With label, With label error.
- `PassflowProps`, the props of `PassflowFlow`, is exported from the package root.

### Changed

- `lodash` and `tailwind-merge` are no longer dependencies. lodash is CommonJS, so it could not be tree-shaken and added about 70 KB minified to an app's bundle; tailwind-merge resolved Tailwind class conflicts in a library that styles only with `passflow-*` classes.

### Internal

- CI loads the packed package in plain Node through both `require` and `import`, and fails if either throws or the two expose different exports.
- README examples import from `@passflow/react` instead of the old package name.
- Two flaky UI tests fixed: the Storybook audits wait for the theme to settle, and the FieldOtp length test no longer depends on keystroke timing.

## [0.15.0] - 2026-11-02

### Breaking

- `react-router` is now a required peer dependency, `^7.0.0 || ^8.0.0`, and is no longer bundled, so the SDK and the host share one router. `react-router-dom` is not a peer. A host on React Router 7 adds `react-router`, which `react-router-dom` 7 already installs; a host on React Router 8 needs React 19.2.7 or later, as React Router 8 itself does. Hosts on React Router 6 are no longer supported. A host that routes with Wouter or TanStack Router installs `react-router` too, because the package imports it.
- `PassflowFlow` inside a host React Router `<Router>` now uses that router. Mount it under a splat route, `<Route path="/auth/*" element={<PassflowFlow />} />`; `pathPrefix` is then relative to that route, and `routerType` is ignored with a console warning. Before, a nested flow ran a private router of its own. A flow with no host router behaves as before.
- The CommonJS entry is `dist/index.cjs`, renamed from `dist/index.cjs.js`. Under the package's `"type": "module"`, Node loaded the old file as an empty module, so `require('@passflow/react')` returned nothing; it now returns the full export set. React Router 8 is ESM-only, so a CommonJS consumer on it relies on Node's `require(esm)`.
- Requires Node `^22.12.0 || ^24.0.0 || >=26.0.0` (`engines`), the same lines as `@passflow/core`.

### Changed

- Requires `@passflow/core` 0.20.1 or later, up from 0.19.0.
- One-time-code fields are one input instead of one per digit. The browser's one-time-code autofill works, a whole code pastes in one go, and numeric codes accept digits only, with the numeric keypad on phones. The boxes look as before, and `custom_css` aimed at `.passflow-field-otp` still styles each box.
- An app's `customCss` is rendered as a `<style>` element inside `#passflow-wrapper`, and only when it is set, instead of in `document.head`. No `HelmetProvider` is needed.
- Developed on React 19. React 18 is still supported and tested in CI.

### Added

- `FieldOtp`, the code field above, with its Storybook stories.

### Fixed

- `TwoFactorSetupMagicLinkFlow` reads `:token` from the host's router. With the router bundled it read a separate copy and never saw the host's route params.
- Type declarations resolve under `moduleResolution` `node16`, `nodenext` and `bundler`, and the `require` entry has its own `.d.cts` declarations. CI type-checks the packed package as a consumer would, on TypeScript 5.9 and 7, with React 19 and React Router 8 and with React 18 and React Router 7.
- The ESM and CommonJS entries load in plain Node with no DOM, as server rendering needs. 0.14.0 threw `window is not defined` at module load, and its ESM entry failed to link its named imports from `lodash`.
- The `option` button's accessible name is all of its visible text, label and hint, so a voice-control user can say what they see (WCAG 2.5.3, flagged by axe 4.14).

### Removed

- The runtime dependencies `react-otp-input`, `react-helmet-async`, `history` and `tailwindcss-scoped-preflight`. `terser` is build-only, and React Router is no longer bundled.

Dependencies: `@simplewebauthn/browser` 14, `react-error-boundary` 6, `query-string` 10 and `tailwind-merge` 3 at runtime, with `input-otp` new. The toolchain moves to TypeScript 7, Vite 8.3, Vitest 5, Biome 2, pnpm 12 and Storybook 10.6; none of it ships.

## [0.14.0] - 2026-11-02

### Changed

- Password sign-up under an OIDC parent reaches the relying party. The provider's interceptor now covers `/auth/register`, so a sign-up on a PKCE app carries `parent_challenge_id` like sign-in does and follows the server's redirect back to the app.
- The line shown while a session is handed over to the app is `ContinuingStatus`, a themed library component, instead of an inline-styled placeholder.
- Requires `@passflow/core` 0.19.0 or later, up from 0.18.0.

Needs a server that accepts an OIDC parent on password sign-up (Passflow `src/v0.22.0`).

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

[0.8.2]: https://github.com/usepassflow/passflow-react-sdk/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/usepassflow/passflow-react-sdk/compare/v0.7.1...v0.8.1
