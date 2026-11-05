import type { FC, PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import { Icon } from '../icon';
import type { LoginScreenNotice as LoginScreenNoticeProps } from './types';

/** `error` is the default; `info` is a neutral note that is not announced as an alert. */
export const LoginAlert: FC<{ message?: string | null; id?: string; tone?: 'error' | 'info' }> = ({
  message,
  id,
  tone = 'error',
}) => {
  if (!message) return null;

  if (tone === 'info') {
    return (
      <div id={id} className='passflow-login-screen-note' role='status'>
        {message}
      </div>
    );
  }

  return (
    <div id={id} className='passflow-form-error' role='alert'>
      <Icon size='small' id='warning' type='general' className='icon-warning' decorative />
      <span className='passflow-form-error-text'>{message}</span>
    </div>
  );
};

/** For a code input locked while a request is in flight: gives focus back when the request ends. */
export const useFocusAfterBusy = (busy: boolean) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const wasBusy = useRef(busy);

  useEffect(() => {
    if (wasBusy.current && !busy) inputRef.current?.focus();
    wasBusy.current = busy;
  }, [busy]);

  return inputRef;
};

export const LoginDivider: FC<{ label: string }> = ({ label }) => (
  <div className='passflow-form-divider' aria-hidden='true'>
    <div className='passflow-form-divider__line-left' />
    <span className='passflow-form-divider__text'>{label}</span>
    <div className='passflow-form-divider__line-right' />
  </div>
);

export const LoginActionStack: FC<PropsWithChildren> = ({ children }) => (
  <div className='passflow-login-screen-actions'>{children}</div>
);

export const LoginProgress: FC<{ message: string }> = ({ message }) => (
  <div className='passflow-login-screen-status' role='status' aria-live='polite'>
    <div className='passflow-login-screen-spinner passflow-login-screen-spinner--small' aria-hidden='true' />
    <p className='passflow-login-screen-text passflow-login-screen-centered-text'>{message}</p>
  </div>
);

export const LoginScreenNotice: FC<LoginScreenNoticeProps> = ({ code, appName, message, codeTestId, appNameTestId }) => (
  <div className='passflow-login-screen-notice' role='note'>
    {code ? (
      <div className='passflow-login-screen-code' data-testid={codeTestId}>
        {code}
      </div>
    ) : null}
    <p className='passflow-login-screen-text passflow-login-screen-centered-text'>
      <span className='passflow-login-screen-app-name' data-testid={appNameTestId}>
        {appName}
      </span>{' '}
      {message}
    </p>
  </div>
);
