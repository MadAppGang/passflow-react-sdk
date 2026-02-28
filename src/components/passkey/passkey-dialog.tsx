/* eslint-disable jsx-a11y/label-has-associated-control */
import { type ChangeEvent, type FC, useState } from 'react';
import { Button, Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, FieldText } from '../ui';

type TPasskeyDialog = {
  isOpen: boolean;
  onChangeOpen: (isOpen: boolean) => void;
  passkeyId: string;
  editUserPasskey: (newName: string, passkeyId: string) => Promise<void> | void;
};

export const PasskeyDialog: FC<TPasskeyDialog> = ({ isOpen, onChangeOpen, passkeyId, editUserPasskey }) => {
  const [value, setValue] = useState<string>('');

  const onChangeValue = (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value);

  const onEditUserPasskeyHandler = () => {
    void editUserPasskey(value, passkeyId);
    setValue('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChangeOpen}>
      <DialogContent
        className={`passflow-w-[320px] passflow-h-[244px] passflow-p-[32px] passflow-rounded-[6px] 
        passflow-bg-White passflow-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
      >
        <DialogHeader>
          <DialogTitle className='!passflow-text-title-2-medium !passflow-text-Dark-Three'>Edit your passkey name</DialogTitle>
        </DialogHeader>
        <div className='passflow-flex passflow-flex-col passflow-gap-[6px] passflow-mt-[16px]'>
          <label htmlFor='new-passkey-name' className='passflow-text-caption-1-medium passflow-text-Grey-Six'>
            Passkey name
          </label>
          <FieldText id='new-passkey-name' value={value} onChange={onChangeValue} />
        </div>
        <div className='passflow-flex passflow-items-center passflow-justify-between passflow-mt-[32px]'>
          <Button
            type='submit'
            variant='primary'
            size='medium'
            className='passflow-min-w-[120px]'
            onClick={onEditUserPasskeyHandler}
          >
            Save
          </Button>
          <DialogClose className='button button--outlined button--medium passflow-min-w-[120px]'>Cancel</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
