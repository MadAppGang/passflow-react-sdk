import { cn } from '@/utils';
import type { FC } from 'react';
import './spinner.css';

export type SpinnerSize = 'small' | 'medium';

export type SpinnerProps = {
  /** `small` sits inline beside a line of text; `medium` stands alone. */
  size?: SpinnerSize;
  /**
   * The accessible name. Omit it when a sibling already announces the busy
   * state — the ring is then decorative and hidden from assistive technology,
   * which is what a status region with its own live text wants.
   */
  label?: string;
};

/**
 * The indeterminate activity ring.
 *
 * It exists as a primitive so its diameter and stroke live in one place rather
 * than in each consuming component's stylesheet. The upgrade dialog uses it;
 * the login screen still draws its own identical ring in
 * `login-screen.css` and should be migrated onto this when that file is next
 * touched.
 */
export const Spinner: FC<SpinnerProps> = ({ size = 'medium', label }) => (
  <span
    className={cn('passflow-spinner', { 'passflow-spinner--small': size === 'small' })}
    role={label === undefined ? undefined : 'status'}
    aria-label={label}
    aria-hidden={label === undefined ? true : undefined}
  />
);
