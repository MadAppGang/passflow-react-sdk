import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './index';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The standalone ring: a view waiting on its first data. */
export const Medium: Story = {
  args: { size: 'medium' },
};

/** Inline beside a line of status text — the size the upgrade dialog uses. */
export const Small: Story = {
  args: { size: 'small' },
};

/**
 * Named, for the case where nothing else announces the wait. Without a label
 * the ring is `aria-hidden`, which is correct only when a live region next to
 * it already says what is happening.
 */
export const Labelled: Story = {
  args: { size: 'medium', label: 'Verifying' },
};
