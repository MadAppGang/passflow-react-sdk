# First-time 2FA enrolment — facts for the next session

Verified while building PFL-769 (0.20.0) with `pnpm test:unit` and Playwright over mocked responses, against `@passflow/core` 0.25.0. Not verified against a real server here.

## Where it lives

- State: `src/hooks/use-two-factor-enrollment.ts`, one discriminated `screen`. It is not in the `hooks` barrel.
- Failure kinds and copy: `enrollmentFailureFrom` and constants in `src/utils/auth-error.ts`.
- Screens: `LoginScreen` kinds `two-factor-code`, `two-factor-setup`, `two-factor-recovery-codes`. Mapping: `flow/two-factor-verify/screen.ts`, `form/two-factor-setup/setup-screen.ts`.
- Link page: `flow/two-factor-setup-magic-link/index.tsx`, `hooks/use-two-factor-setup-magic-link.ts`.

## Gotchas

- The verify flow must not call `useAppSettings`: it dispatches, which replaces the Passflow instance and loses an in-memory link session. That is why these screens are plain and unbranded.
- Verify cannot run before the recovery codes show: `/auth/2fa/verify` matches the OIDC interceptor, which follows `redirect_url` as soon as the response loads.
- A held code goes stale after about 30-60 seconds on the recovery codes screen. The finishing verify then answers wrong code, so the user gets the "Your setup is saved" notice and one new prompt. This is common, not rare.
- Core throws a plain `Error` with no id or status when its 5 minute pending state has gone. Only its two exact messages mean the sign-in is over; a network error must not.
- GET 429s are retried by core at 1s, 2s and 4s, then rejected as raw axios errors. `retry-after` is unreadable cross-origin unless the server exposes it.
- `validateTwoFactorSetupMagicLink` puts a raw 429's body in `code`, so it never reads `RATE_LIMITED`. The hook treats an unknown code as rate limited.
- A direct load of the verify URL with `parent_challenge_id` reads the state twice, because the session exchange remounts the flow. No budget is spent. A test asserting one read must use a client-side move or a URL without it.
- `.passflow-field-otp` is one box; the field is `.passflow-field-otp-field`. To test overflow, measure the last box: the row can keep its own width while the boxes spill out.
- Mocks on the verify flow need a real `access-control-allow-origin` with `access-control-allow-credentials: true`. `/auth/2fa/verify` sends credentials, and `*` shows up as `Network Error`.

## Screenshots catch what the tests do not

The eight-box overflow and a used-link screen that said the same thing three times were both found by reading screenshots with every test green. Playwright's end-of-test shot shows the state after the last click, so an error screen that ends in a Sign in click needs its own capture.

## Open

- A link with no app id runs an anonymous `GET /settings` with no link bearer. Cookie mode runs core's `GET /user/me` from the constructor, also with no link bearer. Both are allowed exceptions to the link session's request list.
- An attempt's own destination is not carried across 2FA. The hosted app passes its target as `successAuthRedirect`, and `useSignInEnding` validates a target from the request with `checkRedirectUrl` before leaving.
- `/two-factor-setup` and `TwoFactorSetupFlow` still exist; no link goes there.
