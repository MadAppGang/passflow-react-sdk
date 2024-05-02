import { FC } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import '@/styles/index.css';
import { Providers } from '@aooth/aooth-js-sdk';
import { cn } from '@/utils';

type TProvidersBox = {
  providers: Providers[];
  onClick: (provider: Providers) => void;
  className?: string;
};

export const ProvidersBox: FC<TProvidersBox> = ({ providers, onClick, className = '' }) => {
  const defaultStyle = 'aooth-flex aooth-justify-center aooth-items-center aooth-flex-row aooth-flex-wrap aooth-gap-[8px]';

  const boxStyles = {
    'aooth-flex-wrap': providers.length <= 1,
    'aooth-grid aooth-grid-cols-providers aooth-gap-[8px] aooth-items-stretch aooth-justify-stretch': providers.length > 1,
  };

  return (
    <div className={cn(defaultStyle, boxStyles, className, 'aooth-grid-')}>
      {providers.map((provider) => (
        <Button onClick={() => onClick(provider)} size='big' variant='provider' type='button' key={provider} withIcon>
          <Icon size='small' type='providers' id={provider} />
          {providers.length <= 2 && <p className='aooth-text-body-2-medium aooth-capitalize'>{provider}</p>}
        </Button>
      ))}
    </div>
  );
};
