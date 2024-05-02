import { FC, PropsWithChildren } from 'react';
import { Icon } from '@/components/ui';
import { cn } from '@/utils';
import '@/styles/index.css';

type TWrapper = PropsWithChildren & {
  iconId?: string;
  labelIconId?: string;
  title?: string;
  subtitle?: string;
  className?: string;
};

export const Wrapper: FC<TWrapper> = ({
  iconId = 'logo',
  labelIconId = 'label',
  title = '',
  subtitle = '',
  className = '',
  children,
}) => {
  const wrapperStyle = 'aooth-absolute aooth-top-1/2 aooth-left-1/2 -aooth-translate-x-1/2 -aooth-translate-y-1/2 aooth-z-10';
  const labelStyle =
    // eslint-disable-next-line max-len
    'aooth-absolute aooth-right-[24px] aooth-bottom-[24px] aooth-bg-Background aooth-rounded-[4px] aooth-px-[12px] aooth-py-[7px] aooth-flex aooth-items-center aooth-justify-center aooth-gap-[4px]';

  return (
    <div id='aooth-wrapper' className='aooth-w-screen aooth-h-screen aooth-relative'>
      <div className={cn('aooth-max-w-[384px] aooth-w-full', wrapperStyle, className)}>
        <div className='aooth-flex aooth-flex-col aooth-items-center aooth-justify-center aooth-gap-[24px]'>
          <Icon id={iconId} size='large' type='general' />
          <div className='aooth-flex aooth-flex-col aooth-items-center aooth-justify-center aooth-gap-[8px]'>
            <h2 className='aooth-text-Dark aooth-text-title-2-bold'>{title}</h2>
            {subtitle && <span className='aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center'>{subtitle}</span>}
          </div>
        </div>
        {children}
      </div>
      <div className={labelStyle}>
        <span className='aooth-text-caption-1-bold aooth-text-Grey-One'>Secured by</span>
        <Icon id={labelIconId} size='small' type='general' className='aooth-w-[35px] aooth-h-[14px]' />
      </div>
    </div>
  );
};
