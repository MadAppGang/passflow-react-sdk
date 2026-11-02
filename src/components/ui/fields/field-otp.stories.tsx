import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import { FieldOtp } from './field-otp';

const LABEL_ID = 'field-otp-story-label';
const ERROR_ID = 'field-otp-story-error';

/**
 * Owns the value, so each story can be typed into, pasted into and cleared
 * with the keyboard. A visible prompt above the boxes names the field, as on
 * a real screen, styled with the library's field label.
 */
const Controlled = (props: ComponentProps<typeof FieldOtp>) => {
  const [value, setValue] = useState(props.value);
  return (
    <div className='passflow-field-container'>
      <p id={LABEL_ID} className='passflow-field-label'>
        Verification code
      </p>
      <FieldOtp
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next);
          props.onChange(next);
        }}
      />
      {props.state === 'error' ? <p id={ERROR_ID}>That code is not valid. Check it and try again.</p> : null}
    </div>
  );
};

/**
 * A one-time code as a row of boxes over one real input: one-time-code
 * autofill, whole-code paste, and digits-only by default. Error and disabled
 * are states of this component; no screen styles its own boxes.
 */
const meta = {
  title: 'Components/FieldOtp',
  component: FieldOtp,
  args: {
    id: 'field-otp-story',
    name: 'otp',
    length: 6,
    value: '',
    labelledBy: LABEL_ID,
    onChange: fn(),
    onComplete: fn(),
  },
  render: (args) => <Controlled {...args} />,
  parameters: {
    layout: 'centered',
    controls: { disable: true },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FieldOtp>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty, waiting for the code. Focus draws the active box and a caret. */
export const Default: Story = {};

/** Part of the code typed: the next box is the active one. */
export const Partial: Story = {
  args: { value: '123' },
};

/** Every box filled; `onComplete` has fired with the code. */
export const Filled: Story = {
  args: { value: '123456' },
};

/** The server rejected the code: every box is marked and the input is `aria-invalid`, described by the message. */
export const ErrorState: Story = {
  name: 'Error',
  args: { value: '123456', state: 'error', describedBy: ERROR_ID },
};

/** Locked while the code is checked, or when it cannot be used. */
export const Disabled: Story = {
  args: { value: '12', state: 'disabled' },
};

/** Letters and digits, with a text keyboard, for codes that are not numeric. */
export const Alphanumeric: Story = {
  args: { charset: 'alphanumeric', value: 'AB3' },
};

/** A four-character code: the row is as long as `length`. */
export const FourDigits: Story = {
  args: { length: 4 },
};
