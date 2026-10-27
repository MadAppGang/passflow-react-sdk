import type { FC } from 'react';
import { Button } from '../button';
import type { UpgradeDialogFactor, UpgradeFactorType } from './types';

type UpgradeFactorListProps = {
  factors: readonly UpgradeDialogFactor[];
  selected: UpgradeFactorType;
  disabled?: boolean;
  label?: string;
  onSelect: (factor: UpgradeFactorType) => void;
};

/**
 * The "use another way" alternatives. Selecting one reports the user's choice;
 * it never navigates.
 *
 * Each row is `Button variant='option'`: the two-line geometry and the pressed
 * look belong to that variant in the button library, not to this list. The list
 * contributes layout only.
 */
export const UpgradeFactorList: FC<UpgradeFactorListProps> = ({
  factors,
  selected,
  disabled = false,
  label = 'Other verification methods',
  onSelect,
}) => (
  <ul className='passflow-upgrade-dialog__alternatives' aria-label={label}>
    {factors.map((factor) => (
      <li key={factor.type} className='passflow-upgrade-dialog__alternative'>
        <Button
          size='big'
          variant='option'
          type='button'
          disabled={disabled}
          pressed={factor.type === selected}
          description={factor.hint}
          data-testid={`upgrade-dialog-factor-${factor.type}`}
          onClick={() => onSelect(factor.type)}
        >
          {factor.label}
        </Button>
      </li>
    ))}
  </ul>
);
