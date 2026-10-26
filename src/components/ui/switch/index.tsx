import { cn } from '@/utils';
import { type ChangeEvent, type FC, useId } from 'react';

type TSwitch = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  /**
   * Overrides the generated input id. Only needed when something outside this
   * component has to point at the input (`aria-describedby`, a test hook, a
   * label rendered elsewhere).
   *
   * The default is a `useId()` value rather than a constant, because a constant
   * breaks the moment a screen renders more than one Switch: duplicate DOM ids
   * are invalid, and every `<label htmlFor>` would resolve to the FIRST input,
   * so clicking row three would toggle row one. The consent screen renders one
   * Switch per requested scope, so this is load-bearing, not hygiene.
   */
  id?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Switch: FC<TSwitch> = ({ label, checked, disabled = false, id, onChange }) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label className={cn('passflow-switch-wrapper', { 'passflow-switch-wrapper--disabled': disabled })} htmlFor={inputId}>
      <span className='passflow-switch-label'>{label}</span>
      <input
        id={inputId}
        type='checkbox'
        className='passflow-switch-input'
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <div className='passflow-switch-track' />
    </label>
  );
};
