/**
 * What a sign-up, sign-in or password change answered instead of a session: `code` when a code was emailed
 * (finish it with `verifyEmailCode`), `link` when a link was emailed instead (the sign-in finishes on that page).
 * `message` is the server's text, or fixed copy when the server sent none.
 */
export type EmailVerificationStep = { kind: 'code'; challengeId: string; message: string } | { kind: 'link'; message: string };

/** The emailed-code step of a screen: `none` while the screen shows its own form. */
export type EmailCodeStep = { kind: 'none' } | EmailVerificationStep;
