import type { FC } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../dialog';
import { UpgradeChallengeView } from './challenge';
import { upgradeDialogDismissHandler } from './state-mapping';
import { UpgradeStatus } from './status';
import type { UpgradeDialogProps } from './types';
import './upgrade-dialog.css';

const DESCRIPTION_ID = 'passflow-upgrade-dialog-description';

/**
 * The assurance-upgrade modal. A switch over `state.kind`, modelled on
 * `LoginScreen`: one discriminated union, one view per state, no transitions of
 * its own.
 *
 * Escape and an overlay click route to the state's cancel or dismiss callback,
 * never to a bare close — cancellation must reach the controller or the
 * caller's promise never settles (§8.1).
 */
export const UpgradeDialog: FC<UpgradeDialogProps> = ({ open, title = 'Extra verification required', state }) => {
  const dismiss = upgradeDialogDismissHandler(state);
  const description = state.kind === 'challenge' ? state.reason : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss?.();
      }}
    >
      <DialogContent
        className='passflow-upgrade-dialog'
        data-testid='upgrade-dialog'
        aria-describedby={description ? DESCRIPTION_ID : undefined}
      >
        <DialogHeader className='passflow-upgrade-dialog__header'>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription id={DESCRIPTION_ID}>{description}</DialogDescription> : null}
        </DialogHeader>
        {state.kind === 'challenge' ? <UpgradeChallengeView {...state} /> : <UpgradeStatus {...state} />}
      </DialogContent>
    </Dialog>
  );
};
