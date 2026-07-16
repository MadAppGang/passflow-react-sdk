import { Icon } from '@/components/ui';
import { cn } from '@/utils';
/* eslint-disable max-len */
import type { FC, PropsWithChildren, ReactNode } from 'react';
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
  /**
   * An optional node rendered between the logo/title block and the form body.
   * Additive slot every auth screen shares — the device verification page passes
   * its RFC 8628 §5.4 code banner here so it sits inside the SAME login card
   * instead of a forked one. Nothing renders when it is absent.
   */
  header?: ReactNode;
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
  header,
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
          {header}
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
