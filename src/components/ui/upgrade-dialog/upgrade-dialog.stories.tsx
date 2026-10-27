import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { UPGRADE_FACTOR_CODE_CONTRACTS } from './state-mapping';
import type { UpgradeDialogFactor, UpgradeDialogProps, UpgradeDialogState } from './types';
import { UpgradeDialog } from './upgrade-dialog';

const handlers = {
  onSelectFactor: fn(),
  onToggleAlternatives: fn(),
  onSubmit: fn(),
  onCancel: fn(),
  onDismiss: fn(),
  onRetry: fn(),
};

const totp: UpgradeDialogFactor = {
  type: 'totp',
  label: 'Authenticator app',
  hint: 'Enter the code from your authenticator app',
  input: 'code',
  code: UPGRADE_FACTOR_CODE_CONTRACTS.totp,
};

const passkey: UpgradeDialogFactor = {
  type: 'passkey',
  label: 'Passkey',
  hint: 'Confirm with your device',
  input: 'none',
};

const recovery: UpgradeDialogFactor = {
  type: 'recovery_codes',
  label: 'Recovery code',
  hint: 'Enter one of your single-use recovery codes',
  input: 'code',
  code: UPGRADE_FACTOR_CODE_CONTRACTS.recovery_codes,
};

const challenge = (overrides: Partial<Extract<UpgradeDialogState, { kind: 'challenge' }>> = {}) =>
  ({
    kind: 'challenge',
    factors: [totp, passkey, recovery],
    selected: 'totp',
    reason: 'This action needs extra verification',
    busy: false,
    error: null,
    showAlternatives: false,
    testId: 'upgrade-dialog-challenge',
    onSelectFactor: handlers.onSelectFactor,
    onToggleAlternatives: handlers.onToggleAlternatives,
    onSubmit: handlers.onSubmit,
    onCancel: handlers.onCancel,
    ...overrides,
  }) satisfies UpgradeDialogState;

const story = (state: UpgradeDialogState, title?: string): UpgradeDialogProps => ({
  open: true,
  title,
  state,
});

const meta = {
  title: 'Components/UpgradeDialog',
  component: UpgradeDialog,
  tags: ['autodocs'],
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof UpgradeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The suggested factor first, with the alternatives behind "use another way". */
export const Challenge: Story = {
  args: story(challenge()),
};

/** The factor list: "use another way" expanded, the current choice pressed. */
export const ChallengeAlternatives: Story = {
  args: story(challenge({ showAlternatives: true })),
};

/** A selected factor awaiting a code — the user picked recovery codes from the list. */
export const ChallengeAwaitingCode: Story = {
  args: story(challenge({ selected: 'recovery_codes', showAlternatives: true })),
};

/**
 * The recovery-code field, which is a different input contract from the OTP one
 * and not merely a different label: the server issues 12-character alphanumeric
 * codes and accepts a configured length up to 16, so the field caps at 16, uses
 * the text keyboard, upper-cases what is typed and claims no OTP autofill.
 * Compare with `Challenge`, whose TOTP field caps at 6 on a numeric keypad. The
 * contract travels with the factor — see `UPGRADE_FACTOR_CODE_CONTRACTS`.
 */
export const ChallengeRecoveryCodeContract: Story = {
  args: story(challenge({ factors: [recovery, totp], selected: 'recovery_codes' })),
};

/** A rejected code: the dialog stays open, the field is invalid, and the attempt is retryable. */
export const ChallengeWrongCode: Story = {
  args: story(challenge({ error: 'That code was not accepted. Try again.' })),
};

/**
 * The factor the server says is not enrolled. `not_registered` is retryable, so
 * the dialog stays on the challenge with the alternatives open rather than
 * showing a terminal panel (§3.3).
 */
export const ChallengeFactorNotRegistered: Story = {
  args: story(
    challenge({
      error: 'That verification method is not set up for this account.',
      showAlternatives: true,
      factors: [passkey, recovery],
      selected: 'passkey',
    }),
  ),
};

/** Submit is disabled while the answer is in flight. */
export const ChallengeSubmitting: Story = {
  args: story(challenge({ busy: true })),
};

/** A single factor: no "use another way" control at all. */
export const ChallengeSingleFactor: Story = {
  args: story(challenge({ factors: [totp] })),
};

/** Passkey suggested: `input: 'none'`, so there is no code field to fill. */
export const PasskeySuggested: Story = {
  args: story(challenge({ factors: [passkey, totp, recovery], selected: 'passkey' })),
};

/**
 * The passkey ceremony is running; cancelling still reaches the controller.
 * The activity ring is `Spinner size='small'` — see `Components/Spinner` for
 * the primitive that owns its geometry.
 */
export const Working: Story = {
  args: story({
    kind: 'working',
    message: 'Waiting for your passkey…',
    detail: 'Follow the prompt from your device to confirm it is you.',
    testId: 'upgrade-dialog-working',
    onCancel: handlers.onCancel,
  }),
};

/**
 * Every waiter replayed cleanly and no stated bar went unmet. The state carries
 * its own way out — a Done control, Escape, an overlay click, and an auto-close
 * timer — so a successful elevation can never leave a modal over the app.
 */
export const Success: Story = {
  args: story({
    kind: 'success',
    message: 'Verification complete',
    detail: 'Your request is continuing.',
    testId: 'upgrade-dialog-success',
    onDismiss: handlers.onDismiss,
  }),
};

/** The same success with the timer disabled: the explicit Done control is the only exit. */
export const SuccessManualClose: Story = {
  args: story({
    kind: 'success',
    message: 'Verification complete',
    detail: 'Your request is continuing.',
    autoCloseMs: 0,
    dismissLabel: 'Done',
    testId: 'upgrade-dialog-success-manual',
    onDismiss: handlers.onDismiss,
  }),
};

/**
 * Elevated and still not enough — the replay was re-challenged. This must never
 * read as success (architecture §13.4).
 */
export const Insufficient: Story = {
  args: story({
    kind: 'insufficient',
    message: 'Verified to AAL2; this action requires AAL3',
    detail: 'The elevation succeeded but the action was challenged again. Nothing was completed.',
    obtained: { acrValues: '2', level: 2 },
    required: { acrValues: '3', level: 3 },
    testId: 'upgrade-dialog-insufficient',
    onDismiss: handlers.onDismiss,
  }),
};

/** A freshness re-challenge: `max_age` demanded, no level. */
export const InsufficientFreshness: Story = {
  args: story({
    kind: 'insufficient',
    message: 'Verified, but this action needs a more recent check',
    obtained: { level: 2 },
    required: { maxAge: 300 },
    testId: 'upgrade-dialog-insufficient-freshness',
    onDismiss: handlers.onDismiss,
  }),
};

/** The user dismissed the dialog, or the passkey ceremony was cancelled. */
export const Cancelled: Story = {
  args: story({
    kind: 'cancelled',
    message: 'Verification cancelled',
    detail: 'The action that needed extra verification was not completed.',
    testId: 'upgrade-dialog-cancelled',
    onDismiss: handlers.onDismiss,
  }),
};

/** A transport failure that the user may retry. */
export const TransportFailureRetryable: Story = {
  args: story({
    kind: 'transport',
    message: 'Verification could not be completed',
    detail: 'The verification request failed before it reached the server.',
    retryable: true,
    testId: 'upgrade-dialog-transport',
    onRetry: handlers.onRetry,
    onDismiss: handlers.onDismiss,
  }),
};

/** FR1's non-retryable 400: the factor is unsupported, or there is no session to elevate. */
export const TransportFailureFinal: Story = {
  args: story({
    kind: 'transport',
    message: 'Verification could not be completed',
    detail: 'The server refused this verification method for your account.',
    retryable: false,
    testId: 'upgrade-dialog-transport-final',
    onDismiss: handlers.onDismiss,
  }),
};

/** The no-usable-factor diagnostic: the offered list is empty, so the flight ends. */
export const NoUsableFactor: Story = {
  args: story({
    kind: 'unsatisfiable',
    message: 'No usable verification method',
    detail: 'This action requires AAL3, and no verification method is available to answer it.',
    required: { acrValues: '3', level: 3 },
    testId: 'upgrade-dialog-unsatisfiable',
    onDismiss: handlers.onDismiss,
  }),
};

/** 501 / BFF — the deployment cannot elevate at all. */
export const Unavailable: Story = {
  args: story({
    kind: 'unavailable',
    message: 'Verification is unavailable',
    detail: 'This deployment cannot raise your assurance level right now.',
    testId: 'upgrade-dialog-unavailable',
    onDismiss: handlers.onDismiss,
  }),
};

/** The server's own attempt budget ran out — `challenge_too_many_attempts`. */
export const Exhausted: Story = {
  args: story({
    kind: 'exhausted',
    message: 'Too many attempts',
    detail: 'No attempts are left for this verification. Start the action again to retry.',
    testId: 'upgrade-dialog-exhausted',
    onDismiss: handlers.onDismiss,
  }),
};

/**
 * The CONTROLLER's local budget ran out — core's terminal `attempts_exhausted`
 * kind. It is the same panel as `Exhausted` (one row of §13.3's settlement
 * table) and it is terminal on purpose: the last failure in the loop is usually
 * a retryable `wrong_code`, and routing it by that made the dialog re-prompt
 * forever for a challenge the server will never accept again.
 */
export const AttemptsExhausted: Story = {
  args: story({
    kind: 'exhausted',
    message: 'Too many attempts',
    detail: 'Too many incorrect attempts. Verification was not completed.',
    testId: 'upgrade-dialog-attempts-exhausted',
    onDismiss: handlers.onDismiss,
  }),
};

/** A custom title, which is the only chrome the dialog takes. */
export const CustomTitle: Story = {
  args: story(challenge(), 'Confirm it is you to transfer funds'),
};

/**
 * The cancel-ACTION state: the prompt is still open and the user can back out.
 * `onCancel` resolves the caller cleanly — which is why this is not the terminal
 * `Cancelled` panel (that one carries `onDismiss` and reports an outcome). §10.2
 * requires both to be catalogued separately.
 */
export const ChallengeCancel: Story = {
  args: story(challenge({ cancelLabel: 'Not now' })),
};
