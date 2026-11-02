import { OTPInput, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS, type SlotProps } from 'input-otp';
import type { FC } from 'react';
import { cn } from '@/utils';
import '@/styles/index.css';
import './field-otp.css';

export type FieldOtpCharset = 'numeric' | 'alphanumeric';

export type FieldOtpState = 'default' | 'error' | 'disabled';

type FieldOtpBaseProps = {
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
  /** Id of the element that describes it, such as the error message. */
  describedBy?: string;
  autoFocus?: boolean;
};

/**
 * The code field is named either by a visible label it draws itself (`label`),
 * or by an element the screen already shows (`labelledBy`), never both. A
 * hidden-only name fails axe `label-title-only` once `describedBy` is set.
 */
export type FieldOtpProps = FieldOtpBaseProps &
  (
    | {
        /** Visible prompt drawn above the boxes, as the field's `<label>`. */
        label: string;
        labelledBy?: never;
      }
    | {
        /** Id of a visible element on the screen that names the code field, such as a prompt or heading. */
        labelledBy: string;
        label?: never;
      }
  );

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
 * a drawing of its value, hidden from assistive technology. With `label` the
 * field draws its own visible label above the boxes; with `labelledBy` it is
 * named by a prompt the screen already shows.
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
  label,
  labelledBy,
  describedBy,
  autoFocus = false,
}) => {
  const { pattern, inputMode } = CHARSETS[charset];

  const input = (
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

  if (label === undefined) return input;

  return (
    <div className='passflow-field-otp-field'>
      <label htmlFor={id} className='passflow-field-label'>
        {label}
      </label>
      {input}
    </div>
  );
};
