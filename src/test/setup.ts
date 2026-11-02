// Registers the jest-dom matchers on vitest's expect and types them.
import '@testing-library/jest-dom/vitest';

// jsdom has no layout, so it has no `elementFromPoint`. FieldOtp's input-otp
// calls it on focus to look for a password-manager badge; with no layout there
// is never an element at a point.
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null;
}
