import type { FC } from 'react';
import './style.css';

export type ContinuingStatusProps = {
  /** The app the user is being taken to; without it the line stays generic. */
  appName?: string;
};

/** The full-page line shown while a session is handed over to the app that asked for it. */
export const ContinuingStatus: FC<ContinuingStatusProps> = ({ appName }) => (
  <div className='passflow-continuing-status' role='status'>
    {appName ? `Continuing to ${appName}…` : 'Continuing…'}
  </div>
);
