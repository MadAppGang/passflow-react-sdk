import type { HandOff, PassflowState } from '@/context/passflow-context';

/** Hand-off scopes when the app asked for none and neither discovery nor the app's settings named any. */
const DEFAULT_HAND_OFF_SCOPES = ['openid', 'profile', 'id'];

/** `list` with `scope` added at the end, in order and without duplicates. */
export const withScope = (list: readonly string[], scope: string): string[] => [...new Set([...list, scope])];

/**
 * The scopes the app asked for, which decide what goes back to it. The one place they are read: `undefined` when
 * there is no hand-off (embedded use), never the sign-in scopes in `state.scopes`.
 */
export const handOffScopes = (handOff: HandOff | undefined): string[] | undefined =>
  handOff ? (handOff.scopes ?? DEFAULT_HAND_OFF_SCOPES) : undefined;

/**
 * What found scopes write under a hand-off: the hand-off scopes (with `id`) and the sign-in scopes (also with
 * `offline`), and only while the hand-off scopes are unset, so the first value found wins and a requested value is
 * never replaced. Nothing without a hand-off or when nothing was found.
 */
export const handOffScopesUpdate = (state: PassflowState, found: string[] | undefined): Partial<PassflowState> => {
  if (!state.handOff || state.handOff.scopes !== undefined || !found?.length) return {};
  const scopes = withScope(found, 'id');
  return { handOff: { ...state.handOff, scopes }, scopes: withScope(scopes, 'offline') };
};
