import { cn } from '@/utils';
import type { ChangeEvent, FC } from 'react';

type TSwitch = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Switch: FC<TSwitch> = ({ label, checked, disabled = false, onChange }) => (
  <label className={cn('passflow-switch-wrapper', { 'passflow-switch-wrapper--disabled': disabled })} htmlFor='switch'>
    <span className='passflow-switch-label'>{label}</span>
    <input
      id='switch'
      type='checkbox'
      className='passflow-switch-input'
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
    <div className='passflow-switch-track' />
  </label>
);
