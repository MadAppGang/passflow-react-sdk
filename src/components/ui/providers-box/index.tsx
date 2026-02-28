import type { FC } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import '@/styles/index.css';
import { cn } from '@/utils';
import type { Providers } from '@passflow/core';

type TProvidersBox = {
  providers: Providers[];
  onClick: (provider: Providers) => void;
  className?: string;
};

export const ProvidersBox: FC<TProvidersBox> = ({ providers, onClick, className = '' }) => {
  const styles = {
    'passflow-providers-box--grid': providers.length > 1,
  };

  return (
    <div className={cn('passflow-providers-box', styles, className)}>
      {providers.map((provider) => (
        <Button
          onClick={() => onClick(provider)}
          size='big'
          variant='provider'
          type='button'
          key={provider}
          withIcon
          className='passflow-provider-item'
        >
          <Icon size='small' type='providers' id={provider} />
          {providers.length <= 2 && <p className='passflow-provider-text'>{provider}</p>}
        </Button>
      ))}
    </div>
  );
};
