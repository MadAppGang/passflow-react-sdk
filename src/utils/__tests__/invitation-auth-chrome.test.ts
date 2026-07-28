import { describe, expect, it } from 'vitest';
import { getInvitationAuthChrome } from '../invitation-auth-chrome';

const invitationToken = (claims: Record<string, unknown>) => {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.signature`;
};

describe('getInvitationAuthChrome', () => {
  it('returns the default chrome outside invitation authentication', () => {
    expect(getInvitationAuthChrome(null, 'sign-in')).toBeNull();
  });

  it('keeps the workspace and inviter visible during sign in', () => {
    const chrome = getInvitationAuthChrome(
      invitationToken({ tenant_name: 'My Workspace', inviter_name: 'Alex Morgan' }),
      'sign-in',
    );

    expect(chrome).toEqual({
      title: 'Sign in to join My Workspace.',
      subtitle: "Alex Morgan invited you. After you sign in, you'll continue to the invitation.",
    });
  });

  it('keeps the workspace visible during account creation', () => {
    const chrome = getInvitationAuthChrome(invitationToken({ tenant_name: 'My Workspace' }), 'sign-up');

    expect(chrome).toEqual({
      title: 'Create your account to join My Workspace.',
      subtitle: "After you create your account, you'll continue to the invitation.",
    });
  });

  it('uses invitation-aware fallback copy for opaque tokens', () => {
    expect(getInvitationAuthChrome('opaque-invitation-token', 'sign-in')).toEqual({
      title: 'Sign in to continue your invitation.',
      subtitle: "After you sign in, you'll continue to the invitation.",
    });
  });
});
