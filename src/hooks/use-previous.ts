import { useEffect, useRef } from 'react';

export type TusePrevious = <T>(value?: T) => T | undefined;

export const usePrevious: TusePrevious = (value) => {
  const ref = useRef<typeof value>(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};
