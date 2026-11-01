import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContinuingStatus } from './index';

const meta = {
  title: 'Components/ContinuingStatus',
  component: ContinuingStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof ContinuingStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The parent challenge named the app the user came from. */
export const WithAppName: Story = {
  args: { appName: 'Acme Portal' },
};

/** The app name is not known yet, or the parent has none. */
export const Generic: Story = {
  args: {},
};
