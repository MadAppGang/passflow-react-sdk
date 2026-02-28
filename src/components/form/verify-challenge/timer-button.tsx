import { Button } from '@/components/ui';
import React, { type FC, type PropsWithChildren, useEffect, useState } from 'react';
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

  const onClickHandler = () => {
    onClick();
    setSeconds(totalSecond);
  };

  return (
    <Button
      disabled={seconds > 0}
      size='small'
      variant='clean'
      type='button'
      className={cn(
        'passflow-button-timer',
        {
          'passflow-button-timer--active': seconds > 0,
          'passflow-button-timer--inactive': seconds === 0,
        },
        className,
      )}
      onClick={onClickHandler}
      {...props}
    >
      Resend {seconds > 0 ? `(${seconds})` : ''}
    </Button>
  );
};
