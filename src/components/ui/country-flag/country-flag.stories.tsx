import type { Meta, StoryObj } from '@storybook/react-vite';
import { CountryFlag } from '.';

const meta = {
  title: 'Components/CountryFlag',
  component: CountryFlag,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof CountryFlag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnitedStates: Story = {
  args: { iso2: 'us' },
};

export const TerritoryAlias: Story = {
  args: { iso2: 'bq' },
};

export const UnknownFallback: Story = {
  args: { iso2: 'zz' },
};
