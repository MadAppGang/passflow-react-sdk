export const routes = {
  signin: {
    path: '/signin',
  },
  signup: {
    path: '/signup',
  },
  verify_otp: {
    path: '/verify-challenge-otp',
  },
  verify_magic_link: {
    path: '/verify-challenge-magic-link',
  },
  forgot_password: {
    path: '/forgot-password',
  },
  forgot_password_success: {
    path: '/forgot-password/success',
  },
  reset_password: {
    path: '/password/reset',
  },
  invitation: {
    path: '/invitation',
  },
  passkey: {
    path: '/passkeysss',
  },
  two_factor_verify: {
    path: '/two-factor-verify',
  },
  two_factor_recovery: {
    path: '/two-factor-recovery',
  },
  two_factor_setup: {
    path: '/two-factor-setup',
  },
  two_factor_setup_magic_link: {
    path: '/two-factor-setup-magic-link/:token',
  },
};
