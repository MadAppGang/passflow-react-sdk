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
        'passflow-text-body-2-semiBold passflow-inline-block passflow-max-w-max passflow-p-[3px]',
        {
          'passflow-text-Grey-One !passflow-opacity-100': seconds > 0,
          'passflow-text-Primary': seconds === 0,
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
