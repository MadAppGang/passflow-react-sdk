import { Button, FieldText } from '@/components/ui';
import type { DeviceError } from '@/types/device-errors';
import type { FC } from 'react';
import { useState } from 'react';
import { DeviceErrorMessage, DeviceShell } from './device-shell';
import '@/styles/index.css';

/**
 * The code entry form, for a user who typed the verification_uri by hand instead
 * of scanning the QR (or whose scanner dropped the query string).
 */
export const DeviceCodeEntryForm: FC<{
  error: DeviceError | null;
  onSubmit: (code: string) => void;
}> = ({ error, onSubmit }) => {
  const [code, setCode] = useState('');

  return (
    <DeviceShell
      title='Enter the code'
      subtitle='Type the code shown on your device.'
      testId='device-code-entry'
      className='passflow-device-wrapper'
    >
      <form
        className='passflow-form'
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(code);
        }}
      >
        <div className='passflow-form-container'>
          <div className='passflow-form-field'>
            <div className='passflow-form-field__header'>
              <label htmlFor='device-user-code' className='passflow-field-label'>
                Code
              </label>
            </div>
            {/*
              Neither pattern nor maxLength: RFC 8628 §6.1 has the SERVER
              normalize what it is given (case, dashes, stray characters), so a
              browser must not reject input the server would have happily
              understood. Nor does a rejected keystroke cost the user any of
              their §5.1 budget — but a form that refuses to submit costs them
              the whole flow.
            */}
            <FieldText
              id='device-user-code'
              name='user_code'
              type='text'
              autoCapitalize='characters'
              autoComplete='off'
              autoCorrect='off'
              spellCheck={false}
              inputMode='text'
              className='passflow-device-code-input'
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <DeviceErrorMessage error={error} />
        </div>
        <Button size='big' variant='primary' type='submit' disabled={code.trim().length === 0}>
          Continue
        </Button>
      </form>
    </DeviceShell>
  );
};
