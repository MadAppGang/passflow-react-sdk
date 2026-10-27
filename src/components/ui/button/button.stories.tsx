import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button } from '.';

/**
 * The shared button. Every look and every interactive state is a prop of this
 * component — no screen describes what a button looks like.
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  args: {
    size: 'big',
    type: 'button',
    onClick: fn(),
  },
  parameters: {
    controls: { disable: true },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Verify' },
};

export const PrimaryDisabled: Story = {
  args: { variant: 'primary', children: 'Verify', disabled: true },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Use another way' },
};

export const Outlined: Story = {
  args: { variant: 'outlined', children: 'Use another way' },
};

export const Warning: Story = {
  args: { variant: 'warning', children: 'Delete account' },
};

export const Clean: Story = {
  args: { variant: 'clean', children: 'Cancel' },
};

export const Dark: Story = {
  args: { variant: 'dark', children: 'Continue' },
};

export const Provider: Story = {
  args: { variant: 'provider', children: 'Continue with Google' },
};

export const Small: Story = {
  args: { variant: 'primary', size: 'small', children: '+' },
};

export const Medium: Story = {
  args: { variant: 'primary', size: 'medium', children: 'Save' },
};

/**
 * `option` — a selectable choice in a list. Single-line form: no `description`,
 * so the row is one line and still full-width and left-aligned.
 */
export const Option: Story = {
  args: { variant: 'option', children: 'Authenticator app' },
};

/**
 * The multi-line state: a label plus its hint. The variant owns the column
 * geometry and the auto height, which is why no call site needs a class to
 * make a button taller.
 */
export const OptionMultiline: Story = {
  args: {
    variant: 'option',
    children: 'Authenticator app',
    description: 'Enter the code from your authenticator app',
  },
};

/** The pressed state: this option is the current choice. `aria-pressed` is set by the variant. */
export const OptionPressed: Story = {
  args: {
    variant: 'option',
    children: 'Recovery code',
    description: 'Enter one of your single-use recovery codes',
    pressed: true,
  },
};

/** The unpressed companion of the state above — the row is selectable but not selected. */
export const OptionUnpressed: Story = {
  args: {
    variant: 'option',
    children: 'Passkey',
    description: 'Confirm with your device',
    pressed: false,
  },
};

/** An option that cannot be chosen right now: the whole row, label and hint included, reads as disabled. */
export const OptionDisabled: Story = {
  args: {
    variant: 'option',
    children: 'SMS code',
    description: 'Enter the code we texted you',
    disabled: true,
  },
};

/** Pressed and disabled at once — the current choice while an answer is in flight. */
export const OptionPressedDisabled: Story = {
  args: {
    variant: 'option',
    children: 'Authenticator app',
    description: 'Enter the code from your authenticator app',
    pressed: true,
    disabled: true,
  },
};

/**
 * The described state of `option`: the hint is the button's DESCRIPTION, not part
 * of its name. The variant pins the accessible name to the label span and points
 * `aria-describedby` at the hint, so assistive tech announces "Passkey" followed
 * by the hint as a description. The two-line geometry is unchanged.
 */
export const OptionDescribed: Story = {
  args: {
    variant: 'option',
    children: 'Passkey',
    description: 'Confirm with your device',
  },
};
