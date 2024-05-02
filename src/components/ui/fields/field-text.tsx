/* eslint-disable react/jsx-props-no-spreading */
import { FC, InputHTMLAttributes } from 'react';
import '@/styles/index.css';
import { cn } from '@/utils';

type TFieldText = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  isError?: boolean;
  className?: string;
  disabled?: boolean;
};

export const FieldText: FC<TFieldText> = ({ id, isError, className, disabled, ...rest }) => {
  const styles = {
    'aooth-field--warning': isError,
  };

  return (
    <input
      id={id}
      type='text'
      className={cn(styles, 'aooth-field aooth-field--focused', className)}
      disabled={disabled}
      {...rest}
    />
  );
};

FieldText.defaultProps = { isError: false, className: '', disabled: false };
