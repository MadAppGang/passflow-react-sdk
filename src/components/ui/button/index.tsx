/* eslint-disable react/button-has-type */
/* eslint-disable react/jsx-props-no-spreading */
import { ButtonHTMLAttributes, FC, PropsWithChildren } from 'react';
import { cn } from '@/utils';
import '@/styles/index.css';

type TButton = PropsWithChildren &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    size: 'small' | 'medium' | 'big';
    variant: 'primary' | 'secondary' | 'outlined' | 'warning' | 'clean' | 'provider' | 'dark';
    type: 'button' | 'submit' | 'reset';
    withIcon?: boolean;
    asIcon?: boolean;
    className?: string;
  };

export const Button: FC<TButton> = ({
  size,
  variant,
  type,
  withIcon = false,
  asIcon = false,
  className = '',
  children,
  ...rest
}) => {
  const styles = {
    'aooth-button aooth-button--big': size === 'big',
    'aooth-button aooth-button--medium': size === 'medium',
    'aooth-button aooth-button--small': size === 'small',
    'aooth-button--primary': variant === 'primary',
    'aooth-button--secondary': variant === 'secondary',
    'aooth-button--outlined': variant === 'outlined',
    'aooth-button--warning': variant === 'warning',
    'aooth-button--clean': variant === 'clean',
    'aooth-button--provider': variant === 'provider',
    'aooth-button--dark': variant === 'dark',
    'aooth-button--with-icon': withIcon,
    'aooth-button--as-icon': asIcon,
  };

  return (
    <button className={cn(styles, className)} type={type} {...rest}>
      {children}
    </button>
  );
};
