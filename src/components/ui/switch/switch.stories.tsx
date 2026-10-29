import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import { Switch } from '.';

/**
 * The shared on/off control: a native checkbox drawn as a switch, labelled by
 * its own text. Checked, disabled and focus are states of this component; no
 * screen draws its own checkbox.
 */
const meta = {
  title: 'Components/Switch',
  component: Switch,
  args: {
    label: 'Enable notifications',
    checked: false,
    onChange: fn(),
  },
  parameters: {
    controls: { disable: true },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { checked: true, disabled: true },
};

/** Owns its state, so the story can be toggled by click or keyboard. */
const Interactive = (props: ComponentProps<typeof Switch>) => {
  const [checked, setChecked] = useState(props.checked);
  return (
    <Switch
      {...props}
      checked={checked}
      onChange={(event) => {
        setChecked(event.target.checked);
        props.onChange(event);
      }}
    />
  );
};

/**
 * The option on the two-factor verify and recovery forms. Unticked by
 * default; ticked, it asks the server to trust this device so later sign-ins
 * from it skip the second factor where the app allows that.
 */
export const TrustThisDevice: Story = {
  args: { label: 'Trust this device' },
  render: (args) => <Interactive {...args} />,
};

/** The same option while the code is being checked: it cannot change mid-request. */
export const TrustThisDeviceBusy: Story = {
  args: { label: 'Trust this device', checked: true, disabled: true },
};
