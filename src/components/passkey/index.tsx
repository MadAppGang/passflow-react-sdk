import { useUserPasskeys } from '@/hooks';
import { type FC, useState } from 'react';
import { Wrapper } from '../form';
import { Button } from '../ui';
import { PasskeyActions } from './passkey-actions';
import { PasskeyDialog } from './passkey-dialog';
import { PasskeyList } from './passkey-list';

type TPasskey = {
  relaingPartyId: string;
};

export const Passkey: FC<TPasskey> = ({ relaingPartyId }) => {
  const [editDialogIsOpen, setEditDialogIsOpen] = useState<boolean>(false);
  const [currentPasskeyId, setCurrentPasskeyId] = useState<string>('');
  const { data, createUserPasskey, editUserPasskey, deleteUserPasskey, isError } = useUserPasskeys();
  if (!data || isError) return null;

  const onCreateUserPasskeyHandler = () => {
    void createUserPasskey(relaingPartyId);
  };

  const onEditUserPasskeyHandler = (newName: string, passkeyId: string) => {
    void editUserPasskey(newName, passkeyId);
    setEditDialogIsOpen(false);
  };

  const passkeyActions = [
    {
      title: 'Edit passkey',
      iconId: 'edit',
      onClick: (id: string) => {
        setEditDialogIsOpen(true);
        setCurrentPasskeyId(id);
      },
    },
    {
      title: 'Remove',
      iconId: 'trash',
      onClick: deleteUserPasskey,
    },
  ];

  return (
    <Wrapper title='Passkeys you created'>
      <PasskeyList
        data={data}
        renderActions={(id, name) => <PasskeyActions passkeyId={id} passkeyName={name} actions={passkeyActions} />}
      />
      <Button
        type='button'
        variant='primary'
        size='big'
        className='passflow-mt-[32px] passflow-mx-auto'
        onClick={onCreateUserPasskeyHandler}
      >
        Create a Passkey
      </Button>
      <PasskeyDialog
        isOpen={editDialogIsOpen}
        onChangeOpen={setEditDialogIsOpen}
        passkeyId={currentPasskeyId}
        editUserPasskey={onEditUserPasskeyHandler}
      />
    </Wrapper>
  );
};
