import { cn } from '@/utils';
import type { FC, PropsWithChildren } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Icon } from '../icon';
import '@/styles/index.css';
import './login-screen.css';

export type LoginScreenShellProps = PropsWithChildren & {
  iconId?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  customCss?: string;
  customLogo?: string;
  customLogoAlt?: string;
  removeBranding?: boolean;
};

export const LoginScreenShell: FC<LoginScreenShellProps> = ({
  iconId = 'logo',
  title = '',
  subtitle = '',
  className = '',
  children,
  customCss,
  customLogo,
  customLogoAlt = 'Application logo',
  removeBranding = false,
}) => (
  <HelmetProvider>
    <Helmet>
      <style type='text/css' className='psfw-custom-styles' data-passflow-style-layer='custom'>
        {customCss}
      </style>
    </Helmet>
    <div id='passflow-wrapper' className='passflow-wrapper'>
      <main className={cn('passflow-form-main-wrapper', className)}>
        <div className='passflow-form-main-container'>
          {customLogo ? (
            <img src={customLogo} alt={customLogoAlt} className='passflow-form-main-container-logo' />
          ) : (
            <Icon id={iconId} size='large' type='general' decorative />
          )}
          {title ? (
            <div className='passflow-form-header'>
              <h1 className='passflow-form-title'>{title}</h1>
              {subtitle ? <span className='passflow-form-subtitle'>{subtitle}</span> : null}
            </div>
          ) : null}
        </div>
        {children}
      </main>
      {!removeBranding ? (
        <footer className='passflow-branding'>
          <p className='passflow-branding-text'>
            Secured by <span className='passflow-branding-text-secondary passflow-secondary-font'>PASSFLOW</span>
          </p>
        </footer>
      ) : null}
    </div>
  </HelmetProvider>
);
