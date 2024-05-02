/* eslint-disable react/jsx-props-no-spreading */
import { FC, InputHTMLAttributes, useState } from 'react';
import { Button, Icon } from '..';
import '@/styles/index.css';
import { intersection, size } from 'lodash';
import { AoothPasswordPolicySettings } from '@aooth/aooth-js-sdk';
import { cn } from '@/utils';

type TFieldPassword = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  value: string;
  passwordPolicy: AoothPasswordPolicySettings | null;
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

export const FieldPassword: FC<TFieldPassword> = ({
  id,
  value,
  passwordPolicy,
  withMessages = false,
  validationErrors = [],
  isError = false,
  className = '',
  disabled = false,
  ...rest
}) => {
  const [isShowPassword, setIsShowPassword] = useState(false);

  const styles = {
    'aooth-field--warning': isError,
  };

  const errorStyles = (fields: string[]) => {
    if (size(value) > 0 && size(intersection(validationErrors, fields)) === 0) return 'aooth-stroke-Success aooth-text-Success';
    return null;
  };

  const changeIcon = (fields: string[]) => {
    if (size(value) > 0 && size(intersection(validationErrors, fields)) === 0) return 'check';
    return 'close';
  };

  const buttonStyle = 'aooth-absolute aooth-right-0 aooth-top-1/2 -aooth-translate-y-1/2 -aooth-translate-x-[12px]';

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
      <div className='aooth-relative aooth-w-full'>
        <input
          id={id}
          value={value}
          type={isShowPassword ? 'text' : 'password'}
          className={cn(styles, 'aooth-field aooth-field--focused aooth-pr-[40px]', className)}
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
            <Icon size='small' type='general' id='eye-on' className='!aooth-bg-Background' />
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
            <Icon size='small' type='general' id='eye-off' className='!aooth-bg-Background' />
          </Button>
        )}
      </div>
      {withMessages && (
        <div className='aooth-flex aooth-flex-col aooth-gap-[4px] aooth-mt-[4px]'>
          <p
            className={cn(
              `aooth-flex aooth-gap-[4px] aooth-items-center aooth-justify-start 
              aooth-text-caption-1-medium aooth-text-Grey-One`,
              errorStyles(['length']),
            )}
          >
            <Icon
              size='small'
              id={changeIcon(['length'])}
              type='general'
              className={cn('aooth-stroke-Grey-One', errorStyles(['length']))}
            />
            At least {minPasswordLength} characters
          </p>
          <p
            className={cn(
              `aooth-flex aooth-gap-[4px] aooth-items-center aooth-justify-start 
                aooth-text-caption-1-medium aooth-text-Grey-One`,
              errorStyles(['uppercase', 'lowercase', 'number', 'symbol']),
            )}
          >
            <Icon
              size='small'
              id={changeIcon(['uppercase', 'lowercase', 'number', 'symbol'])}
              type='general'
              className={cn('aooth-stroke-Grey-One', errorStyles(['uppercase', 'lowercase', 'number', 'symbol']))}
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
};
