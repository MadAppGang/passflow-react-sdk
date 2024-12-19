/* eslint-disable react/jsx-props-no-spreading */
import React, { FC } from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import '@/styles/index.css';

type TLink = RouterLinkProps & {
  children: React.ReactNode | string;
};

export const Link: FC<TLink> = ({ to, children, ...props }) => (
  <RouterLink to={to} {...props}>
    {children}
  </RouterLink>
);
