import type { ChangeEvent, FC } from 'react';

type TSwitch = {
  label: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Switch: FC<TSwitch> = ({ label, checked, onChange }) => (
  <label className='passflow-switch-wrapper' htmlFor='switch'>
    <span className='passflow-switch-label'>{label}</span>
    <input id='switch' type='checkbox' className='passflow-switch-input' checked={checked} onChange={onChange} />
    <div className='passflow-switch-track' />
  </label>
);
