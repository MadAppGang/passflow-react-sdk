import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from '.';

/**
 * A label only assistive technology reads. The canvas is empty on purpose:
 * the text is in the accessibility tree (inspect it, or use the a11y panel),
 * not on screen.
 */
const meta = {
  title: 'Components/VisuallyHidden',
  component: VisuallyHidden,
  tags: ['autodocs'],
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The hidden name the verify screens give their code boxes. */
export const Default: Story = {
  args: { id: 'visually-hidden-story', children: 'Verification code' },
};
