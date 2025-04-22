import { cn } from '@/utils';
import type { FC } from 'react';
import { Button, Icon, Popover, PopoverContent, PopoverTrigger } from '../ui';

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
        <Button type='button' variant='clean' size='small' asIcon className='passflow-button--hover-bg'>
          <Icon type='general' id='dots-vertical' size='small' />
        </Button>
      </div>
    </PopoverTrigger>
    <PopoverContent>
      <div className='passflow-popover-menu'>
        {actions.map(({ title, iconId, onClick }) => (
          <Button
            key={title}
            type='button'
            variant='clean'
            size='small'
            withIcon
            className='passflow-popover-menu-item'
            onClick={() => void onClick(passkeyId, passkeyName ?? '')}
          >
            <Icon type='general' id={iconId} size='small' className={cn({ 'icon-warning': iconId === 'trash' })} />
            <span
              className={cn('passflow-popover-menu-item-text', {
                'passflow-popover-menu-item-text--warning': iconId === 'trash',
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
