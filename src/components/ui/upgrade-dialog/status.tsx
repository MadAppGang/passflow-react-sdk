import { type FC, useEffect } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import { Spinner } from '../spinner';
import { describeAssuranceBar } from './state-mapping';
import type { AssuranceBar, UpgradeDialogState } from './types';

/** Every state that is not the collecting challenge. */
export type UpgradeStatusState = Exclude<UpgradeDialogState, { kind: 'challenge' }>;

type Tone = 'working' | 'success' | 'problem' | 'neutral';

const TONE: Record<UpgradeStatusState['kind'], Tone> = {
  working: 'working',
  success: 'success',
  insufficient: 'problem',
  unsatisfiable: 'problem',
  unavailable: 'problem',
  exhausted: 'problem',
  transport: 'problem',
  cancelled: 'neutral',
};

/**
 * How long `success` stays on screen before it closes itself (§13.4: "reports
 * success and closes"). Long enough to be read, short enough that the app is
 * never held behind a modal the user cannot see a reason for.
 */
export const UPGRADE_SUCCESS_AUTO_CLOSE_MS = 1800;

const BarRow: FC<{ term: string; bar: AssuranceBar }> = ({ term, bar }) => (
  <div className='passflow-upgrade-dialog__bar'>
    <span className='passflow-upgrade-dialog__bar-term'>{term}</span>
    <span className='passflow-upgrade-dialog__bar-value'>{describeAssuranceBar(bar)}</span>
  </div>
);

/**
 * The non-collecting views: `working`, `success` and the six terminal outcomes
 * of §13.3's settlement table.
 *
 * `insufficient` is deliberately rendered in the problem tone with both bars
 * shown: the elevation succeeded and the action still did not, and the dialog
 * must not report success when the replay was re-challenged (§13.4).
 *
 * `success` owns its own exit: a Done control and an auto-close timer, both
 * calling the state's `onDismiss`. The affordance lives here rather than in the
 * provider because a modal that cannot be closed is a property of this
 * component, and the Storybook story for the state has to show the way out.
 */
export const UpgradeStatus: FC<UpgradeStatusState> = (state) => {
  const tone = TONE[state.kind];
  const { detail } = state;

  const autoClose = state.kind === 'success' ? (state.autoCloseMs ?? UPGRADE_SUCCESS_AUTO_CLOSE_MS) : 0;
  const autoDismiss = state.kind === 'success' ? state.onDismiss : undefined;

  useEffect(() => {
    if (autoDismiss === undefined || autoClose <= 0) return;
    const timer = setTimeout(autoDismiss, autoClose);
    return () => clearTimeout(timer);
  }, [autoClose, autoDismiss]);

  return (
    <div className='passflow-upgrade-dialog__status' data-testid={state.testId} data-upgrade-state={state.kind}>
      <div
        className={`passflow-upgrade-dialog__status-head passflow-upgrade-dialog__status-head--${tone}`}
        role={tone === 'problem' ? 'alert' : 'status'}
        aria-live={tone === 'problem' ? 'assertive' : 'polite'}
      >
        {tone === 'working' ? <Spinner size='small' /> : null}
        {tone === 'success' ? <Icon size='small' id='check' type='general' className='icon-success' decorative /> : null}
        {tone === 'problem' ? <Icon size='small' id='warning' type='general' className='icon-warning' decorative /> : null}
        <span className='passflow-upgrade-dialog__status-message'>{state.message}</span>
      </div>

      {detail ? <p className='passflow-upgrade-dialog__status-detail'>{detail}</p> : null}

      {state.kind === 'insufficient' ? (
        <div className='passflow-upgrade-dialog__bars' data-testid='upgrade-dialog-bars'>
          <BarRow term='Verified' bar={state.obtained} />
          <BarRow term='Required' bar={state.required} />
        </div>
      ) : null}

      {state.kind === 'unsatisfiable' && state.required ? (
        <div className='passflow-upgrade-dialog__bars' data-testid='upgrade-dialog-bars'>
          <BarRow term='Required' bar={state.required} />
        </div>
      ) : null}

      <div className='passflow-upgrade-dialog__actions'>
        {state.kind === 'transport' && state.retryable && state.onRetry ? (
          <Button size='big' variant='primary' type='button' data-testid='upgrade-dialog-retry' onClick={state.onRetry}>
            {state.retryLabel ?? 'Try again'}
          </Button>
        ) : null}
        {state.kind === 'working' && state.onCancel ? (
          <Button size='big' variant='clean' type='button' data-testid='upgrade-dialog-cancel' onClick={state.onCancel}>
            Cancel
          </Button>
        ) : null}
        {state.kind !== 'working' ? (
          <Button size='big' variant='clean' type='button' data-testid='upgrade-dialog-dismiss' onClick={state.onDismiss}>
            {state.dismissLabel ?? (state.kind === 'success' ? 'Done' : 'Close')}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
