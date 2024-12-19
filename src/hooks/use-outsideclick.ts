import { RefObject, useEffect } from 'react';

export const useOutsideClick = <T extends HTMLElement>(ref: RefObject<T>, onClickOutside?: () => void) => {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        if (onClickOutside) {
          onClickOutside();
        }
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [onClickOutside, ref]);
};
