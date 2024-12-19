/* eslint-disable react/button-has-type */
/* eslint-disable react/jsx-props-no-spreading */
import { ButtonHTMLAttributes, CSSProperties, FC, JSX, MouseEvent, PropsWithChildren, useEffect, useState } from 'react';
import { cn } from '@/utils';
import '@/styles/index.css';

type RippleProps = {
  size: number;
  x: number;
  y: number;
};

export const Ripple: FC<RippleProps> = ({ size, x, y }) => {
  const style: CSSProperties = {
    width: size,
    height: size,
    left: x,
    top: y,
  };

  return <span className='passflow-ripple !passflow-bg-current/60' style={style} />;
};

type TButton = PropsWithChildren &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    size: 'small' | 'medium' | 'big';
    variant: 'primary' | 'secondary' | 'outlined' | 'warning' | 'clean' | 'provider' | 'dark';
    type: 'button' | 'submit' | 'reset';
    withIcon?: boolean;
    asIcon?: boolean;
    className?: string;
    withRipple?: boolean;
  };

export const Button: FC<TButton> = ({
  size,
  variant,
  type,
  onClick,
  withIcon = false,
  asIcon = false,
  className = '',
  children,
  withRipple = true,
  ...rest
}) => {
  const [ripples, setRipples] = useState<JSX.Element[]>();

  const styles = {
    'passflow-button passflow-button--big': size === 'big',
    'passflow-button passflow-button--medium': size === 'medium',
    'passflow-button passflow-button--small': size === 'small',
    'passflow-button--primary': variant === 'primary',
    'passflow-button--secondary': variant === 'secondary',
    'passflow-button--outlined': variant === 'outlined',
    'passflow-button--warning': variant === 'warning',
    'passflow-button--clean': variant === 'clean',
    'passflow-button--provider': variant === 'provider',
    'passflow-button--dark': variant === 'dark',
    'passflow-button--with-icon': withIcon,
    'passflow-button--as-icon': asIcon,
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rippleSize = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - rippleSize / 2;
    const y = e.clientY - rect.top - rippleSize / 2;

    const newRipple = <Ripple key={Date.now()} size={rippleSize} x={x} y={y} />;

    setRipples((prev) => (prev ? [...prev, newRipple] : [newRipple]));

    onClick?.(e);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (ripples) {
      timer = setTimeout(() => {
        setRipples(undefined);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [ripples]);

  return (
    <button className={cn(styles, className)} type={type} onClick={handleClick} {...rest}>
      {children}
      {withRipple && (
        <div aria-hidden className='passflow-absolute passflow-inset-0 passflow-overflow-hidden'>
          {ripples}
        </div>
      )}
    </button>
  );
};
