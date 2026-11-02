/* eslint-disable react/button-has-type */
/* eslint-disable react/jsx-props-no-spreading */
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FC,
  type JSX,
  type MouseEvent,
  type PropsWithChildren,
  useEffect,
  useState,
} from 'react';
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

  return <span className='passflow-ripple passflow-ripple-effect' style={style} />;
};

type TButton = PropsWithChildren &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    size: 'small' | 'medium' | 'big';
    /**
     * `link` is an action set in running text: no box, link colour, no ripple.
     */
    variant: 'primary' | 'secondary' | 'outlined' | 'warning' | 'clean' | 'provider' | 'dark' | 'option' | 'link';
    type: 'button' | 'submit' | 'reset';
    withIcon?: boolean;
    asIcon?: boolean;
    className?: string;
    withRipple?: boolean;
    /**
     * The `option` variant's second line — the hint under the label. Rendered
     * only by that variant, which owns the two-line geometry. It is part of the
     * button's accessible name ("label hint"), because it is visible text.
     */
    description?: string;
    /**
     * Toggle state for the `option` variant: mirrored to `aria-pressed` and
     * styled by the variant itself, so no call site has to describe what
     * "selected" looks like.
     */
    pressed?: boolean;
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
  description,
  pressed,
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
    'passflow-button--option': variant === 'option',
    'passflow-button--link': variant === 'link',
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
    <button className={cn(styles, className)} type={type} aria-pressed={pressed} onClick={handleClick} {...rest}>
      {variant === 'option' ? (
        // WCAG 2.5.3 (Label in Name): the button is named from its content, so
        // both visible lines are in the name ("label hint") and a voice user can
        // say what they see. The space keeps the two lines separate words in
        // that name; the column flex layout does not render it.
        <>
          <span className='passflow-button__option-label'>{children}</span>
          {description ? (
            <>
              {' '}
              <span className='passflow-button__option-hint'>{description}</span>
            </>
          ) : null}
        </>
      ) : (
        children
      )}
      {withRipple && variant !== 'link' && (
        <div aria-hidden className='passflow-ripple-container'>
          {ripples}
        </div>
      )}
    </button>
  );
};
