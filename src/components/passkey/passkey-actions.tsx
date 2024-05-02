import { FC } from 'react';
import { Button, Icon, Popover, PopoverContent, PopoverTrigger } from '../ui';
import { cn } from '@/utils';

type TPasskeyActions = {
  passkeyId: string;
  passkeyName: string | null;
  actions: {
    title: string;
    iconId: string;
    onClick: (newName: string, passkeyId: string) => Promise<void> | void;
  }[];
};

export const PasskeyActions: FC<TPasskeyActions> = ({ passkeyId, passkeyName, actions }) => (
  <Popover>
    <PopoverTrigger asChild className='aooth-ml-auto'>
      <div>
        <Button
          type='button'
          variant='clean'
          size='small'
          asIcon
          className='hover:aooth-bg-Background aooth-w-[28px] aooth-h-[28px]'
        >
          <Icon type='general' id='dots-vertical' size='small' />
        </Button>
      </div>
    </PopoverTrigger>
    <PopoverContent>
      <div
        className={`aooth-w-[125px] aooth-p-[6px] aooth-flex aooth-flex-col aooth-gap-[4px] 
        aooth-items-start aooth-shadow-[0_5px_20px_0px_rgba(0,0,0,0.05)]`}
      >
        {actions.map(({ title, iconId, onClick }) => (
          <Button
            key={title}
            type='button'
            variant='clean'
            size='small'
            withIcon
            className='!aooth-max-w-full aooth-justify-start aooth-p-[6px] aooth-gap-[6px] hover:aooth-bg-Background'
            // eslint-disable-next-line no-void
            onClick={() => void onClick(passkeyId, passkeyName ?? '')}
          >
            <Icon type='general' id={iconId} size='small' className={cn({ 'icon-warning': iconId === 'trash' })} />
            <span
              className={cn('aooth-text-body-2-medium aooth-text-Dark-Three', {
                'text-Warning': iconId === 'trash',
              })}
            >
              {title}
            </span>
          </Button>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);
