import { type FC, type FormEvent, useRef, useState } from 'react';
import { Button } from '../button';
import { FieldText } from '../fields/field-text';
import { LoginAlert } from '../login-screen';
import { UpgradeFactorList } from './factor-list';
import type { UpgradeDialogChallengeState, UpgradeFactorType } from './types';

const CODE_FIELD_ID = 'passflow-upgrade-code';
const CODE_ERROR_ID = 'passflow-upgrade-code-error';

/**
 * The collecting view: the suggested factor, its input affordance, the
 * alternatives toggle, and the two terminal controls.
 *
 * Selection is reported through `onSelectFactor` before `onSubmit` ever fires —
 * architecture §13.2's late-join boundary is factor selection, not submission,
 * so the controller must learn of the choice while the user is still typing.
 */
export const UpgradeChallengeView: FC<UpgradeDialogChallengeState> = ({
  factors,
  selected,
  busy = false,
  error,
  showAlternatives = false,
  submitLabel = 'Verify',
  cancelLabel = 'Cancel',
  alternativesLabel = 'Use another way',
  testId,
  onSelectFactor,
  onToggleAlternatives,
  onSubmit,
  onCancel,
}) => {
  const [code, setCode] = useState('');
  const reported = useRef<UpgradeFactorType | null>(null);

  const active = factors.find((factor) => factor.type === selected) ?? factors[0];
  // The code contract travels WITH the factor (§H12): length, charset and
  // autofill are the factor's own statement, never this component's guess. A
  // six-character cap applied to every factor truncated a 12-character recovery
  // code into a guaranteed rejection.
  const codeContract = active?.input === 'code' ? active.code : undefined;
  const needsCode = codeContract !== undefined;
  const hasAlternatives = factors.length > 1;

  const report = (factor: UpgradeFactorType) => {
    if (reported.current === factor) return;
    reported.current = factor;
    onSelectFactor(factor);
  };

  const choose = (factor: UpgradeFactorType) => {
    setCode('');
    report(factor);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!active) return;
    const trimmed = code.trim();
    if (needsCode && trimmed.length === 0) return;
    report(active.type);
    onSubmit(needsCode ? trimmed : undefined);
  };

  return (
    <form className='passflow-upgrade-dialog__form' data-testid={testId} aria-busy={busy} onSubmit={handleSubmit} noValidate>
      {active ? (
        <div className='passflow-upgrade-dialog__factor'>
          <span className='passflow-upgrade-dialog__factor-label'>{active.label}</span>
          {active.hint ? <span className='passflow-upgrade-dialog__factor-hint'>{active.hint}</span> : null}
        </div>
      ) : null}

      {codeContract ? (
        <div className='passflow-upgrade-dialog__field'>
          <label htmlFor={CODE_FIELD_ID} className='passflow-field-label'>
            Verification code
          </label>
          <FieldText
            id={CODE_FIELD_ID}
            name='upgrade_code'
            type='text'
            inputMode={codeContract.inputMode}
            autoComplete={codeContract.autoComplete}
            autoCorrect='off'
            autoCapitalize={codeContract.autoCapitalize}
            spellCheck={false}
            maxLength={codeContract.maxLength}
            value={code}
            disabled={busy}
            isError={Boolean(error)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? CODE_ERROR_ID : undefined}
            data-testid='upgrade-dialog-code'
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
      ) : null}

      <LoginAlert id={CODE_ERROR_ID} message={error} />

      <div className='passflow-upgrade-dialog__actions'>
        <Button
          size='big'
          variant='primary'
          type='submit'
          disabled={busy || !active || (needsCode && code.trim().length === 0)}
          data-testid='upgrade-dialog-submit'
        >
          {busy ? 'Verifying…' : submitLabel}
        </Button>
        {hasAlternatives ? (
          <Button
            size='big'
            variant='clean'
            type='button'
            disabled={busy}
            aria-expanded={showAlternatives}
            data-testid='upgrade-dialog-alternatives'
            onClick={onToggleAlternatives}
          >
            {alternativesLabel}
          </Button>
        ) : null}
        {showAlternatives && hasAlternatives ? (
          <UpgradeFactorList factors={factors} selected={selected} disabled={busy} onSelect={choose} />
        ) : null}
        <Button size='big' variant='clean' type='button' data-testid='upgrade-dialog-cancel' onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
};
