import { Icon } from '@/components/ui';
import { cn } from '@/utils';
/* eslint-disable max-len */
import type { FC, PropsWithChildren } from 'react';
import '@/styles/index.css';

type TWrapper = PropsWithChildren & {
  iconId?: string;
  title?: string;
  subtitle?: string;
  className?: string;
};

export const Wrapper: FC<TWrapper> = ({ iconId = 'logo', title = '', subtitle = '', className = '', children }) => {
  const wrapperStyle =
    'passflow-relative passflow-flex passflow-flex-col passflow-items-center passflow-gap-[32px] passflow-justify-center passflow-p-[24px] passflow-w-full passflow-rounded-[6px] passflow-bg-White passflow-bg-no-repeat passflow-bg-cover passflow-bg-center';
  const labelStyle =
    'passflow-absolute passflow-right-[24px] passflow-bottom-[24px] passflow-bg-Background passflow-rounded-[4px] passflow-px-[12px] passflow-py-[7px] passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px]';

  return (
    <div id='passflow-wrapper' className='passflow-w-screen passflow-h-screen passflow-relative'>
      <div className={cn('passflow-w-full passflow-h-full', wrapperStyle, className)}>
        <div className='passflow-flex passflow-flex-col passflow-items-center passflow-justify-center passflow-gap-[24px] passflow-max-w-[384px] passflow-w-full passflow-mx-auto'>
          <Icon id={iconId} size='large' type='general' />
          {title && (
            <div className='passflow-flex passflow-flex-col passflow-items-center passflow-justify-center passflow-gap-[8px]'>
              <h2 className='passflow-text-Dark-Three passflow-text-title-2-bold'>{title}</h2>
              {subtitle && (
                <span className='passflow-text-body-2-medium passflow-text-Grey-Six passflow-text-center'>{subtitle}</span>
              )}
            </div>
          )}
        </div>
        {children}
      </div>
      <div className={labelStyle}>
        <p className='passflow-text-caption-1-bold passflow-text-Grey-Six'>
          Secured by <span className='passflow-secondary-font !text-[11px]'>PASSFLOW</span>
        </p>
      </div>
    </div>
  );
};
