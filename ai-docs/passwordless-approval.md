# Passwordless approval and federated landing — facts for the next session

Verified while building PFL-769 (0.19.0) with `pnpm test:unit`, Playwright over Storybook and mocked responses, against `@passflow/core` 0.24.0.

## Where it lives here

- UI: `LoginScreen` states `passwordless-waiting` and `passwordless-approval` in `src/components/ui/login-screen/`.
- Screens: `src/components/form/verify-challenge/verify-challenge-magic-link.tsx` (waiting) and `verify-challenge-approval.tsx` (approving).
- Copy and error mapping: `src/utils/auth-error.ts`.
- Landing: `useSecondFactorLanding` in `src/components/provider/passflow-provider.tsx`, the forward effect in `src/components/flow/passflow/index.tsx`, the URL in `src/hooks/use-provider.ts`.

## Gotchas

- `input-otp` selects only the last box when a full field gains focus. Playwright's `fill('123')` on an unfocused `4821` gives `4821` again. To shorten a full `FieldOtp` in a test, focus it and press Backspace, and assert the value.
- The landing harness (`src/components/provider/__tests__/support/federated-harness.tsx`) stubs the adapter on core's axios. It works only while core is inlined (`server.deps.inline` in both vitest configs), because an externalized core loads a second axios. A symlinked core hides this, since Vitest inlines anything outside `node_modules`: the tests passed on a symlink and 21 failed on the published package with byte-identical code.
- A symlink in `node_modules/@passflow/core` is a safe way to develop against an unreleased core, because the manifests cannot commit it, but any `pnpm install` resets it. Always rerun `pnpm test:unit` after moving to the published package.
- A login-page landing URL must have no trailing slash: the server refuses `/web/`. `redirectto` is left out when there is no target, not sent empty.
- Typed OTP with the PKCE verifier gone shows the default "no longer available" copy: core throws a plain `Error` with no id, so it cannot be told apart.

## Not covered by this repo's tests

- The demo app does not mount `Passflow` with `federatedLanding`, so login-page mode has no Playwright coverage here, only the harness tests.
