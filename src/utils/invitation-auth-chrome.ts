import { type InvitationToken, parseToken } from '@passflow/core';
import { undefinedOnCatch } from './undefined-on-catch';

export type InvitationAuthIntent = 'sign-in' | 'sign-up';

type InvitationAuthChrome = {
  title: string;
  subtitle: string;
};

const authAction = {
  'sign-in': {
    title: 'Sign in',
    completion: 'sign in',
  },
  'sign-up': {
    title: 'Create your account',
    completion: 'create your account',
  },
} as const;

export const getInvitationAuthChrome = (
  inviteToken: string | null | undefined,
  intent: InvitationAuthIntent,
): InvitationAuthChrome | null => {
  if (!inviteToken) return null;

  const invitation = undefinedOnCatch(parseToken)(inviteToken) as InvitationToken | undefined;
  const tenantName = invitation?.tenant_name?.trim();
  const inviterName = invitation?.inviter_name?.trim();
  const action = authAction[intent];

  return {
    title: tenantName ? `${action.title} to join ${tenantName}.` : `${action.title} to continue your invitation.`,
    subtitle: inviterName
      ? `${inviterName} invited you. After you ${action.completion}, you'll continue to the invitation.`
      : `After you ${action.completion}, you'll continue to the invitation.`,
  };
};
