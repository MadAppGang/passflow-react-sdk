import { Icon } from '@/components/ui';
import { cn } from '@/utils';
/* eslint-disable max-len */
import type { FC, PropsWithChildren } from 'react';
import '@/styles/index.css';
import { Helmet, HelmetProvider } from 'react-helmet-async';

type TWrapper = PropsWithChildren & {
  iconId?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  customCss?: string;
  customLogo?: string;
  removeBranding?: boolean;
};

export const Wrapper: FC<TWrapper> = ({
  iconId = 'logo',
  title = '',
  subtitle = '',
  className = '',
  children,
  customCss,
  customLogo,
  removeBranding = false,
}) => {
  return (
    <HelmetProvider>
      <Helmet>
        <style type='text/css'>{customCss}</style>
      </Helmet>
      <div id='passflow-wrapper' className='passflow-wrapper'>
        <div className={cn('passflow-form-main-wrapper', className)}>
          <div className='passflow-form-main-container'>
            {customLogo ? (
              <img src={customLogo} alt='custom logo' className='passflow-form-main-container-logo' />
            ) : (
              <Icon id={iconId} size='large' type='general' />
            )}
            {title && (
              <div className='passflow-form-header'>
                <h2 className='passflow-form-title'>{title}</h2>
                {subtitle && <span className='passflow-form-subtitle'>{subtitle}</span>}
              </div>
            )}
          </div>
          {children}
        </div>
        {!removeBranding && (
          <div className='passflow-branding'>
            <p className='passflow-branding-text'>
              Secured by <span className='passflow-branding-text-secondary passflow-secondary-font'>PASSFLOW</span>
            </p>
          </div>
        )}
      </div>
    </HelmetProvider>
  );
};
