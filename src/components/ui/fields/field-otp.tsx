import { OTPInput, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS, type SlotProps } from 'input-otp';
import type { FC } from 'react';
import { cn } from '@/utils';
import '@/styles/index.css';
import './field-otp.css';

export type FieldOtpCharset = 'numeric' | 'alphanumeric';

export type FieldOtpState = 'default' | 'error' | 'disabled';

export type FieldOtpProps = {
  /** Id of the one real `<input>`; the boxes are drawn from its value. */
  id: string;
  /** Form field name, for a native form submit. */
  name?: string;
  /** Number of characters in the code, and of boxes drawn. */
  length: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once the code reaches `length` characters. */
  onComplete?: (value: string) => void;
  /** Which characters are accepted; also picks the on-screen keyboard. Default `numeric`. */
  charset?: FieldOtpCharset;
  /** `error` marks the code invalid (`aria-invalid`); `disabled` locks it. Default `default`. */
  state?: FieldOtpState;
  /** Id of the element that names the code field (a prompt, heading or hidden label). */
  labelledBy: string;
  /** Id of the element that describes it, such as the error message. */
  describedBy?: string;
  autoFocus?: boolean;
};

const CHARSETS: Record<FieldOtpCharset, { pattern: string; inputMode: 'numeric' | 'text' }> = {
  numeric: { pattern: REGEXP_ONLY_DIGITS, inputMode: 'numeric' },
  alphanumeric: { pattern: REGEXP_ONLY_DIGITS_AND_CHARS, inputMode: 'text' },
};

type SlotViewProps = SlotProps & { state: FieldOtpState };

const Slot: FC<SlotViewProps> = ({ char, isActive, hasFakeCaret, state }) => (
  <div
    className={cn('passflow-field-otp', {
      'passflow-field-otp--active': isActive,
      'passflow-field-otp--error': state === 'error',
      'passflow-field-otp--disabled': state === 'disabled',
    })}
  >
    {char}
    {hasFakeCaret ? <span className='passflow-field-otp__caret' /> : null}
  </div>
);

/**
 * A one-time code entered as a row of boxes.
 *
 * There is one real `<input>` (named, `autocomplete="one-time-code"`), so SMS
 * autofill, password managers and pasting a whole code all work. The boxes are
 * a drawing of its value, hidden from assistive technology. The field has no
 * visible label of its own: `labelledBy` points at the prompt that asks for
 * the code, or at a `VisuallyHidden` label where the screen has none.
 */
export const FieldOtp: FC<FieldOtpProps> = ({
  id,
  name,
  length,
  value,
  onChange,
  onComplete,
  charset = 'numeric',
  state = 'default',
  labelledBy,
  describedBy,
  autoFocus = false,
}) => {
  const { pattern, inputMode } = CHARSETS[charset];

  return (
    <OTPInput
      id={id}
      name={name}
      maxLength={length}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      pattern={pattern}
      inputMode={inputMode}
      autoComplete='one-time-code'
      disabled={state === 'disabled'}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={state === 'error' ? true : undefined}
      autoFocus={autoFocus}
      noScriptCSSFallback={null}
      containerClassName={cn('passflow-field-otp-group', { 'passflow-field-otp-group--disabled': state === 'disabled' })}
      render={({ slots }) => (
        <div className='passflow-field-otp-slots' aria-hidden>
          {slots.map((slot, position) => (
            // Slots are positions in the code: the index is their identity.
            // biome-ignore lint/suspicious/noArrayIndexKey: a slot is its position
            <Slot key={position} {...slot} state={state} />
          ))}
        </div>
      )}
    />
  );
};
