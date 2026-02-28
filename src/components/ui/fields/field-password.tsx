/* eslint-disable react/jsx-props-no-spreading */
import { type InputHTMLAttributes, forwardRef, useState } from 'react';
import { Button, Icon } from '..';
import '@/styles/index.css';
import { cn } from '@/utils';
import type { PassflowPasswordPolicySettings } from '@passflow/core';
import { intersection, size } from 'lodash';

type TFieldPassword = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  value: string;
  passwordPolicy: PassflowPasswordPolicySettings | null;
  withMessages?: boolean;
  validationErrors?: string | string[];
  isError?: boolean;
  className?: string;
  disabled?: boolean;
};

const generateMessage = (
  requires: Record<'requireLowerCase' | 'requireUpperCase' | 'requireSymbol' | 'requireNumber', boolean>,
) => {
  const requiresString = {
    requireNumber: 'number',
    requireSymbol: 'symbol',
    requireLowerCase: 'lowercase letter',
    requireUpperCase: 'uppercase letter',
  };
  const requirements = Object.keys(requires).filter((key) => requires[key as keyof typeof requires]);
  const requirementsString = new Intl.ListFormat('en').format(
    requirements.map((requirement) => requiresString[requirement as keyof typeof requiresString]),
  );

  return `Contain a ${requirementsString}`;
};

export const FieldPassword = forwardRef<HTMLInputElement, TFieldPassword>(
  (
    {
      id,
      value,
      passwordPolicy,
      withMessages = false,
      validationErrors = [],
      isError = false,
      className = '',
      disabled = false,
      ...rest
    },
    ref,
  ) => {
    const [isShowPassword, setIsShowPassword] = useState(false);

    const styles = {
      'passflow-field--error': isError,
    };

    const errorStyles = (fields: string[]) => {
      if (size(value) > 0 && size(intersection(validationErrors, fields)) === 0)
        return 'passflow-password-validation-item--success';
      return null;
    };

    const changeIcon = (fields: string[]) => {
      if (size(value) > 0 && size(intersection(validationErrors, fields)) === 0) return 'check';
      return 'close';
    };

    const handleShowPassword = () => setIsShowPassword((prev) => !prev);

    if (passwordPolicy === null) return null;

    const {
      min_password_length: minPasswordLength,
      require_lowercase: requireLowerCase,
      require_number: requireNumber,
      require_symbol: requireSymbol,
      require_uppercase: requireUpperCase,
    } = passwordPolicy;

    return (
      <>
        <div className='passflow-field-wrapper'>
          <input
            ref={ref}
            id={id}
            value={value}
            type={isShowPassword ? 'text' : 'password'}
            className={cn('passflow-field-input passflow-field--focused passflow-field-input--with-icon', styles, className)}
            disabled={disabled}
            {...rest}
          />
          {isShowPassword ? (
            <Button
              className='passflow-button-display-password passflow-field-icon-button'
              size='small'
              type='button'
              variant='clean'
              asIcon
              withIcon
              onClick={handleShowPassword}
            >
              <Icon size='small' type='general' id='eye-on' />
            </Button>
          ) : (
            <Button
              className='passflow-button-display-password passflow-field-icon-button'
              size='small'
              type='button'
              variant='clean'
              asIcon
              withIcon
              onClick={handleShowPassword}
            >
              <Icon size='small' type='general' id='eye-off' />
            </Button>
          )}
        </div>
        {withMessages && (
          <div className='passflow-password-validation'>
            <p className={cn('passflow-password-validation-item', errorStyles(['length']))}>
              <Icon size='small' id={changeIcon(['length'])} type='general' className={cn(errorStyles(['length']))} />
              At least {minPasswordLength} characters
            </p>
            <p className={cn('passflow-password-validation-item', errorStyles(['uppercase', 'lowercase', 'number', 'symbol']))}>
              <Icon
                size='small'
                id={changeIcon(['uppercase', 'lowercase', 'number', 'symbol'])}
                type='general'
                className={cn(errorStyles(['uppercase', 'lowercase', 'number', 'symbol']))}
              />
              {generateMessage({
                requireNumber,
                requireSymbol,
                requireLowerCase,
                requireUpperCase,
              })}
            </p>
          </div>
        )}
      </>
    );
  },
);
