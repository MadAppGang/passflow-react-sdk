/* eslint-disable jsx-a11y/label-has-associated-control */
import { FC, useState } from 'react';
import { Button, Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, FieldText } from '../ui';

type TPasskeyDialog = {
  isOpen: boolean;
  onChangeOpen: (isOpen: boolean) => void;
  passkeyId: string;
  editUserPasskey: (newName: string, passkeyId: string) => Promise<void> | void;
};

export const PasskeyDialog: FC<TPasskeyDialog> = ({ isOpen, onChangeOpen, passkeyId, editUserPasskey }) => {
  const [value, setValue] = useState<string>('');

  const onChangeValue = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value);

  const onEditUserPasskeyHandler = () => {
    void editUserPasskey(value, passkeyId);
    setValue('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChangeOpen}>
      <DialogContent
        className={`aooth-w-[320px] aooth-h-[244px] aooth-p-[32px] aooth-rounded-[6px] 
        aooth-bg-White aooth-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
      >
        <DialogHeader>
          <DialogTitle className='!aooth-text-title-2-medium !aooth-text-Dark-Three'>Edit your passkey name</DialogTitle>
        </DialogHeader>
        <div className='aooth-flex aooth-flex-col aooth-gap-[6px] aooth-mt-[16px]'>
          <label htmlFor='new-passkey-name' className='aooth-text-caption-1-medium aooth-text-Grey-Six'>
            Passkey name
          </label>
          <FieldText id='new-passkey-name' value={value} onChange={onChangeValue} />
        </div>
        <div className='aooth-flex aooth-items-center aooth-justify-between aooth-mt-[32px]'>
          <Button
            type='submit'
            variant='primary'
            size='medium'
            className='aooth-min-w-[120px]'
            onClick={onEditUserPasskeyHandler}
          >
            Save
          </Button>
          <DialogClose className='button button--outlined button--medium aooth-min-w-[120px]'>Cancel</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
