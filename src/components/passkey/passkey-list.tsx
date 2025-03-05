import { FC, JSX } from 'react';
import { PassflowUserPasskey } from '@passflow/passflow-js-sdk';
import { Icon } from '../ui';
import { FORMATS } from '@/constants';
import { formatDateToString, usedFieldString } from '@/utils';

type TPasskeyList = {
  data: PassflowUserPasskey[];
  renderActions: (id: string, name: string | null) => JSX.Element;
};

export const PasskeyList: FC<TPasskeyList> = ({ data, renderActions }) => {
  const lastUsedString = (lastUsed: Date | string) => {
    const usedField = usedFieldString(lastUsed, 'last_used');
    if (usedField === 'default') return formatDateToString(lastUsed, FORMATS.fullMonthDayYear);
    return usedField;
  };

  return (
    <ul
      className={`passflow-flex passflow-flex-col passflow-gap-[24px] passflow-max-w-[384px] passflow-w-full passflow-p-[24px] 
      passflow-rounded-[6px] passflow-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)] passflow-mt-[32px]`}
    >
      {data.map(({ id, name, enrolled_at: enrolledAt, last_auth_at: lastUsed }) => (
        <li key={id} className='passflow-flex passflow-gap-[16px] passflow-items-start passflow-justify-start'>
          <Icon type='general' id='passkey' size='large' />
          <div className='passflow-flex passflow-flex-col passflow-items-start passflow-justify-start passflow-gap-[2px]'>
            <p className='passflow-text-title-3-medium passflow-text-Dark-Three'>{name ?? 'Passkey'}</p>
            <p className='passflow-text-body-2-medium passflow-text-Grey-Six'>
              Created: {formatDateToString(enrolledAt, FORMATS.fullMonthDayYear)}
            </p>
            <p className='passflow-text-body-2-medium passflow-text-Grey-Six'>Last used: {lastUsedString(lastUsed)}</p>
          </div>
          {renderActions(id, name)}
        </li>
      ))}
    </ul>
  );
};
