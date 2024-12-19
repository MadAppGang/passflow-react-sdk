import { FC } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import '@/styles/index.css';
import { Providers } from '@passflow/passflow-js-sdk';
import { cn } from '@/utils';

type TProvidersBox = {
  providers: Providers[];
  onClick: (provider: Providers) => void;
  className?: string;
};

export const ProvidersBox: FC<TProvidersBox> = ({ providers, onClick, className = '' }) => {
  const defaultStyle =
    // eslint-disable-next-line max-len
    'passflow-w-full passflow-flex passflow-justify-center passflow-items-center passflow-flex-row passflow-flex-wrap passflow-gap-[8px]';

  const boxStyles = {
    'passflow-flex-wrap': providers.length <= 1,
    'passflow-grid passflow-grid-cols-providers passflow-gap-[8px] passflow-items-stretch passflow-justify-stretch':
      providers.length > 1,
  };

  return (
    <div className={cn(defaultStyle, boxStyles, className, 'passflow-grid-')}>
      {providers.map((provider) => (
        <Button onClick={() => onClick(provider)} size='big' variant='provider' type='button' key={provider} withIcon>
          <Icon size='small' type='providers' id={provider} />
          {providers.length <= 2 && (
            <p className='passflow-text-Dark-Three passflow-text-body-2-medium passflow-capitalize'>{provider}</p>
          )}
        </Button>
      ))}
    </div>
  );
};
