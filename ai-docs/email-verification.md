# Email verification code step — facts for the next session

Verified while building PFL-724 (0.18.0) against a local Passflow server and in Playwright.

## Contract (server)

- `POST /auth/register` and `/auth/login` can answer 200 `{challenge_id, email_verification_required: true, message}` with no tokens. The code goes to `POST /auth/validate {challenge_id, otp}`; its answer is a normal sign-in answer (tokens, PKCE code or `tfa_token`). Resend = repeat the original request.
- 200 with `email_verification_required` and NO `challenge_id`: the code budget (3 per address) is spent and a link was emailed. The link opens reset-password with `token=<grant>`; `POST /auth/password/change` creates the account and returns tokens.

## Where it lives here

- `src/hooks/use-email-code-step.ts` — the step controller; `src/utils/email-verification.ts` — reading the server answer and the reducer.
- `src/utils/auth-error.ts` — the allow-list of error ids whose server `error.message` is shown. `error.not.found` is deliberately NOT on it: showing it would reveal whether an account exists.
- UI: `LoginScreen` states `email-code`, `new-password`, and `status` with tone `info`.

## Gotchas

- `@passflow/core` (0.22) lets a 429 on a POST through as a raw axios error, not a `PassflowError`. `auth-error.ts` reads both shapes; keep it that way until core wraps it.
- The server's debug code (`123456` in test configs) is accepted only for NEW users. A sign-in challenge for an existing user needs the real OTP (read it from the challenge table).
- The server's mock mailer does not log mail bodies, so the link continuation cannot be followed end to end in a local browser; Playwright covers it with mocked routes (`playwright/tests/reset-email-verification.spec.ts`).
- Callbacks registered via `Passflow.session()` after construction never reach core's AuthService (core defect, open as of core 0.22).
