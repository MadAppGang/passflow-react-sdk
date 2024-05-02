import { ChangeEvent, FC } from 'react';

type TSwitch = {
  label: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Switch: FC<TSwitch> = ({ label, checked, onChange }) => (
  <label className='aooth-relative aooth-inline-flex aooth-items-center aooth-gap-[12px] aooth-cursor-pointer' htmlFor='switch'>
    <span className='aooth-text-Dark-Three aooth-text-caption-1-medium'>{label}</span>
    <input id='switch' type='checkbox' className='aooth-sr-only aooth-peer' checked={checked} onChange={onChange} />
    <div
      className={`aooth-w-[28px] aooth-h-[16px] aooth-rounded-full dark:aooth-bg-Grey-Two 
        peer-checked:after:aooth-translate-x-full rtl:peer-checked:after:-aooth-translate-x-full after:aooth-content-[''] 
        after:aooth-absolute after:aooth-top-1/2 after:-aooth-translate-y-1/2 after:aooth-end-[14px] after:aooth-bg-white 
        after:aooth-rounded-full after:aooth-h-[12px] after:aooth-w-[12px] after:aooth-transition-all 
        peer-checked:aooth-bg-Primary`}
    />
  </label>
);
