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
    <PopoverTrigger asChild className='passflow-ml-auto'>
      <div>
        <Button
          type='button'
          variant='clean'
          size='small'
          asIcon
          className='hover:passflow-bg-Background passflow-w-[28px] passflow-h-[28px]'
        >
          <Icon type='general' id='dots-vertical' size='small' />
        </Button>
      </div>
    </PopoverTrigger>
    <PopoverContent>
      <div
        className={`passflow-w-[125px] passflow-p-[6px] passflow-flex passflow-flex-col passflow-gap-[4px] 
        passflow-items-start passflow-shadow-[0_5px_20px_0px_rgba(0,0,0,0.05)]`}
      >
        {actions.map(({ title, iconId, onClick }) => (
          <Button
            key={title}
            type='button'
            variant='clean'
            size='small'
            withIcon
            // eslint-disable-next-line max-len
            className='!passflow-max-w-full passflow-justify-start passflow-p-[6px] passflow-gap-[6px] hover:passflow-bg-Background'
            // eslint-disable-next-line no-void
            onClick={() => void onClick(passkeyId, passkeyName ?? '')}
          >
            <Icon type='general' id={iconId} size='small' className={cn({ 'icon-warning': iconId === 'trash' })} />
            <span
              className={cn('passflow-text-body-2-medium passflow-text-Dark-Three', {
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
