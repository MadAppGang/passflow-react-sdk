/* eslint-disable react/jsx-props-no-spreading */
import { type InputHTMLAttributes, forwardRef } from 'react';
import '@/styles/index.css';
import { cn } from '@/utils';

type TFieldText = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  isError?: boolean;
  className?: string;
  disabled?: boolean;
};

export const FieldText = forwardRef<HTMLInputElement, TFieldText>(
  ({ id, isError = false, className = '', disabled = false, ...rest }, ref) => {
    const styles = {
      'passflow-field--warning': isError,
    };

    return (
      <input
        ref={ref}
        id={id}
        type='text'
        className={cn(styles, 'passflow-field passflow-field--focused', className)}
        disabled={disabled}
        {...rest}
      />
    );
  },
);
