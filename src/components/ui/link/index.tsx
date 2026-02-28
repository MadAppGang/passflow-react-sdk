import { useNavigation } from '@/hooks';
/* eslint-disable react/jsx-props-no-spreading */
import type { FC, MouseEvent, PropsWithChildren } from 'react';
import '@/styles/index.css';

type LinkProps = PropsWithChildren<{
  to: string;
  search?: string;
  replace?: boolean;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}>;

export const Link: FC<LinkProps> = ({ to, search, replace = false, children, className, onClick, ...props }) => {
  const { navigate } = useNavigation();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (onClick) {
      onClick(e);
    }

    navigate({ to, search, replace });
  };

  const getHref = (): string => {
    const searchParam = search ? (search.startsWith('?') ? search : `?${search}`) : '';
    return `${to}${searchParam}`;
  };

  return (
    <a href={getHref()} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
};
