/* eslint-disable react/jsx-props-no-spreading */
import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Button, Icon } from '..';
import '@/styles/index.css';
import { intersection, size } from 'lodash';
import { PassflowPasswordPolicySettings } from '@passflow/passflow-js-sdk';
import { cn } from '@/utils';

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
      'passflow-field--warning': isError,
    };

    const errorStyles = (fields: string[]) => {
      if (size(value) > 0 && size(intersection(validationErrors, fields)) === 0)
        return 'passflow-stroke-Success passflow-text-Success';
      return null;
    };

    const changeIcon = (fields: string[]) => {
      if (size(value) > 0 && size(intersection(validationErrors, fields)) === 0) return 'check';
      return 'close';
    };

    const buttonStyle =
      'passflow-absolute passflow-right-0 passflow-top-1/2 -passflow-translate-y-1/2 -passflow-translate-x-[12px]';

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
        <div className='passflow-relative passflow-w-full'>
          <input
            ref={ref}
            id={id}
            value={value}
            type={isShowPassword ? 'text' : 'password'}
            className={cn(styles, 'passflow-field passflow-field--focused passflow-pr-[40px]', className)}
            disabled={disabled}
            {...rest}
          />
          {isShowPassword ? (
            <Button
              className={buttonStyle}
              size='small'
              type='button'
              variant='clean'
              asIcon
              withIcon
              onClick={handleShowPassword}
            >
              <Icon size='small' type='general' id='eye-on' className='!passflow-bg-Background' />
            </Button>
          ) : (
            <Button
              className={buttonStyle}
              size='small'
              type='button'
              variant='clean'
              asIcon
              withIcon
              onClick={handleShowPassword}
            >
              <Icon size='small' type='general' id='eye-off' className='!passflow-bg-Background' />
            </Button>
          )}
        </div>
        {withMessages && (
          <div className='passflow-flex passflow-flex-col passflow-gap-[4px] passflow-mt-[4px]'>
            <p
              className={cn(
                `passflow-flex passflow-gap-[4px] passflow-items-center passflow-justify-start 
              passflow-text-caption-1-medium passflow-text-Grey-One`,
                errorStyles(['length']),
              )}
            >
              <Icon
                size='small'
                id={changeIcon(['length'])}
                type='general'
                className={cn('passflow-stroke-Grey-One', errorStyles(['length']))}
              />
              At least {minPasswordLength} characters
            </p>
            <p
              className={cn(
                `passflow-flex passflow-gap-[4px] passflow-items-center passflow-justify-start 
                passflow-text-caption-1-medium passflow-text-Grey-One`,
                errorStyles(['uppercase', 'lowercase', 'number', 'symbol']),
              )}
            >
              <Icon
                size='small'
                id={changeIcon(['uppercase', 'lowercase', 'number', 'symbol'])}
                type='general'
                className={cn('passflow-stroke-Grey-One', errorStyles(['uppercase', 'lowercase', 'number', 'symbol']))}
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
