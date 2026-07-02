import type { FC } from 'react';

/**
 * Renders the "additional authentication required" UI shown when the
 * server returns 403 `upgrade_required` from `/auth/session/exchange`.
 *
 * **Code path is unreachable today.** The server's `EvaluatePolicy`
 * helper is a scaffolded no-op (returns Satisfied=true for every
 * valid token). The placeholder is shipped now so it is already in
 * place when Subtask E lands and the SDK begins routing the user to
 * the augmented `/auth/refresh` flow with the `upgrade` field. See:
 *
 *   - `docs/adr/0002-session-exchange-endpoint.md`
 *     (section "The EvaluatePolicy helper contract")
 *   - `docs/roadmap/auth-level-enforcement.md` (Subtasks D + E)
 *
 * Consumers can replace this component via the
 * `<PassflowFlow upgradeRequiredPlaceholder={...} />` prop (TODO:
 * wire the prop through once Subtask E activates the path).
 */
export const UpgradeRequiredPlaceholder: FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '0.95rem',
        color: '#666',
        background: '#fff8e1',
        borderBottom: '1px solid #ffe082',
      }}
      role='status'
      aria-live='polite'
    >
      Additional authentication required (not yet implemented — please log in again).
    </div>
  );
};
