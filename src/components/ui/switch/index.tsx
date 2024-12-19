import { ChangeEvent, FC } from 'react';

type TSwitch = {
  label: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Switch: FC<TSwitch> = ({ label, checked, onChange }) => (
  <label
    className='passflow-relative passflow-inline-flex passflow-items-center passflow-gap-[12px] passflow-cursor-pointer'
    htmlFor='switch'
  >
    <span className='passflow-text-Dark-Three passflow-text-caption-1-medium'>{label}</span>
    <input id='switch' type='checkbox' className='passflow-sr-only passflow-peer' checked={checked} onChange={onChange} />
    <div
      className={`passflow-w-[28px] passflow-h-[16px] passflow-rounded-full dark:passflow-bg-Grey-Two 
        peer-checked:after:passflow-translate-x-full rtl:peer-checked:after:-passflow-translate-x-full
        after:passflow-content-[''] after:passflow-absolute after:passflow-top-1/2 after:-passflow-translate-y-1/2 
        after:passflow-end-[14px] after:passflow-bg-white after:passflow-rounded-full after:passflow-h-[12px] 
        after:passflow-w-[12px] after:passflow-transition-all peer-checked:passflow-bg-Primary`}
    />
  </label>
);
