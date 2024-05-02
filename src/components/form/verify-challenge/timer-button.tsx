/* eslint-disable react/jsx-props-no-spreading */
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import '@/styles/index.css';
import { cn } from '@/utils';

type TTimerButton = PropsWithChildren & {
  totalSecond: number;
  onClick: () => void;
  className?: string;
};

export const TimerButton: FC<TTimerButton> = ({ totalSecond, onClick, className = '', ...props }) => {
  const [seconds, setSeconds] = useState(totalSecond);

  useEffect(() => {
    const interval = setInterval(() => {
      if (seconds > 0) {
        setSeconds((prev) => prev - 1);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [seconds]);

  return (
    <Button
      disabled={seconds > 0}
      size='small'
      variant='clean'
      type='button'
      className={cn(
        'aooth-text-body-2-semiBold aooth-inline-block aooth-max-w-max aooth-p-[3px]',
        {
          'aooth-text-Grey-One !aooth-opacity-100': seconds > 0,
          'aooth-text-Primary': seconds === 0,
        },
        className,
      )}
      onClick={onClick}
      {...props}
    >
      Resend {seconds > 0 ? `(${seconds})` : ''}
    </Button>
  );
};
