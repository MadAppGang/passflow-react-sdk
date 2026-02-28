import type { TwoFactorMethod } from '@passflow/core';
import * as Dialog from '@radix-ui/react-dialog';
import type { FC } from 'react';

type MethodSelectorProps = {
  availableMethods: TwoFactorMethod[];
  currentMethod: TwoFactorMethod;
  onSelectMethod: (method: TwoFactorMethod) => void;
  isOpen: boolean;
  onClose: () => void;
};

const methodLabels: Partial<Record<TwoFactorMethod, string>> = {
  totp: 'Authenticator App',
  email_otp: 'Email Code',
  sms_otp: 'SMS Code',
  passkey: 'Passkey',
  recovery_codes: 'Recovery Code',
  push_fcm: 'Push Notification (FCM)',
  push_webpush: 'Push Notification (Web)',
};

const methodIcons: Partial<Record<TwoFactorMethod, string>> = {
  totp: '📱',
  email_otp: '✉️',
  sms_otp: '💬',
  passkey: '🔑',
  recovery_codes: '🔒',
  push_fcm: '🔔',
  push_webpush: '🔔',
};

export const MethodSelector: FC<MethodSelectorProps> = ({
  availableMethods,
  currentMethod,
  onSelectMethod,
  isOpen,
  onClose,
}) => {
  const handleSelect = (method: TwoFactorMethod) => {
    onSelectMethod(method);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className='pf-dialog-overlay' />
        <Dialog.Content className='pf-dialog-content pf-method-selector-dialog'>
          <Dialog.Title className='pf-dialog-title'>Choose Verification Method</Dialog.Title>
          <Dialog.Description className='pf-dialog-description'>
            Select an alternative method to verify your identity
          </Dialog.Description>

          <div className='pf-method-selector-list'>
            {availableMethods.map((method) => (
              <button
                key={method}
                type='button'
                className={`pf-method-selector-item ${method === currentMethod ? 'pf-method-selector-item-active' : ''}`}
                onClick={() => handleSelect(method)}
                disabled={method === currentMethod}
              >
                <span className='pf-method-icon'>{methodIcons[method] || '🔐'}</span>
                <span className='pf-method-label'>{methodLabels[method] || method}</span>
                {method === currentMethod && <span className='pf-method-current-badge'>Current</span>}
              </button>
            ))}
          </div>

          <Dialog.Close asChild>
            <button type='button' className='pf-dialog-close' aria-label='Close'>
              &times;
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
