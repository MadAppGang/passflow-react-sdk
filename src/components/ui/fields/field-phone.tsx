/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { ChangeEvent, FC, InputHTMLAttributes, useMemo, useRef, useState } from 'react';
import { CountryIso2, FlagImage, defaultCountries, parseCountry, usePhoneInput } from 'react-international-phone';
import { getCountryForTimezone } from 'countries-and-timezones';
import { Button, Icon } from '..';
import { eq, size } from 'lodash';
import { cn } from '@/utils';
import { useOutsideClick } from '@/hooks';

import '@/styles/index.css';
import 'react-international-phone/style.css';

type TFieldPhone = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isError?: boolean;
  className?: string;
  // eslint-disable-next-line react/no-unused-prop-types
  ref?: null;
};

export const FieldPhone: FC<TFieldPhone> = ({ id, onChange, isError = false, className = '' }) => {
  const [show, setShow] = useState<boolean>(false);
  const [filterValue, setFilterValue] = useState<string>('');

  const [isFocused, setIsFocused] = useState<boolean>(false);

  const refWrapper = useRef<HTMLDivElement>(null);
  useOutsideClick(refWrapper, () => {
    setShow(false);
    setFilterValue('');
  });

  const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userCountry = getCountryForTimezone(userTZ);

  const { inputValue, country, setCountry, handlePhoneValueChange, inputRef } = usePhoneInput({
    defaultCountry: userCountry?.id.toLocaleLowerCase() || 'us',
  });

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    handlePhoneValueChange(e);
    onChange(e);
  };

  const filteredCountries = useMemo(
    () =>
      defaultCountries.filter((defCountry) => {
        const { name } = parseCountry(defCountry);
        return name.toLowerCase().includes(filterValue.toLowerCase());
      }),
    [filterValue],
  );

  const preferredCountries = useMemo(
    () =>
      defaultCountries.filter((defCountry) => {
        const { iso2 } = parseCountry(defCountry);
        return eq(iso2, userCountry?.id.toLocaleLowerCase());
      }) ?? null,
    [userCountry?.id],
  );

  const handleShow = () => setShow(true);
  const handleClose = () => setShow(false);

  const handleChangeCountry = (iso2: CountryIso2) => {
    setCountry(iso2);
    setFilterValue('');
    handleClose();
  };

  return (
    <div
      ref={refWrapper}
      className={cn(
        'passflow-relative passflow-flex passflow-items-center passflow-justify-start passflow-bg-Background',
        '!passflow-h-[48px] passflow-w-full passflow-rounded-[4px] passflow-text-body-2-medium passflow-text-Dark-Three',
        { '!passflow-outline-Primary !passflow-outline-1 !passflow-outline': isFocused, 'passflow-field--warning': isError },
        className,
      )}
    >
      {!show ? (
        <>
          <Button
            type='button'
            variant='clean'
            onClick={handleShow}
            size='big'
            className={cn(
              'passflow-min-w-[41px] passflow-w-[41px] passflow-ml-[12px] passflow-rounded-[4px]',
              'passflow-gap-[4px] passflow-bg-Background',
            )}
          >
            <FlagImage iso2={country.iso2} className='passflow-w-[21px]' />
            <Icon type='general' id='caret-down' size='small' />
          </Button>
          <input
            id={id}
            ref={inputRef}
            value={inputValue}
            onChange={handlePhoneChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'passflow-w-full passflow-px-[8px] passflow-h-[48px] passflow-bg-Background passflow-text-Dark-Three',
              'passflow-text-body-2-medium focus-within:passflow-outline-none passflow-rounded-[4px]',
            )}
          />
        </>
      ) : (
        <div
          className={cn(
            'passflow-w-full passflow-relative passflow-z-20 passflow-pl-[28px]',
            'passflow-bg-Background passflow-rounded-[4px]',
          )}
        >
          <input
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className={cn(
              'passflow-w-full passflow-px-[8px] passflow-h-[48px] passflow-bg-Background passflow-text-Dark-Three',
              'passflow-text-body-2-medium passflow-rounded-[4px] focus-visible:passflow-outline-none',
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder='Search for a country'
          />
          <div className='passflow-absolute passflow-left-[12px] passflow-top-1/2 -passflow-translate-y-1/2'>
            <Icon type='general' id='search' size='small' />
            {/* <SearchIcon /> */}
          </div>
        </div>
      )}
      <ul
        className={cn(
          'passflow-w-full passflow-absolute passflow-top-[2px] passflow-translate-y-[48px] passflow-left-0 passflow-z-10',
          'passflow-max-h-[200px] passflow-rounded-b-[4px] passflow-overflow-y-auto passflow-bg-White',
          'passflow-shadow-[0_4px_15px_0_#00000017]',
          {
            'passflow-block': show,
            'passflow-hidden': !show,
          },
        )}
      >
        {size(filteredCountries) > 0 ? (
          <>
            <div
              className={cn(
                'passflow-sticky passflow-top-0 passflow-left-0 passflow-w-full passflow-overflow-x-hidden',
                'passflow-h-[10px] passflow-bg-White passflow-z-10',
              )}
            />
            {size(filterValue) === 0 && (
              <>
                {preferredCountries.map((defCountry) => {
                  const { name, dialCode, iso2 } = parseCountry(defCountry);
                  return (
                    <li
                      key={iso2}
                      title={name}
                      role='button'
                      onClick={() => handleChangeCountry(iso2)}
                      className={cn(
                        'passflow-group passflow-flex passflow-items-center passflow-justify-start passflow-bg-White',
                        'passflow-px-[12px] passflow-py-[7px] passflow-w-full passflow-max-h-[32px]',
                        'hover:passflow-bg-Background passflow-cursor-pointer',
                      )}
                    >
                      <FlagImage iso2={iso2} className='passflow-w-[21px] passflow-h-[15px]' />
                      <span className='passflow-ml-[8px] passflow-text-body-2-medium passflow-text-Dark-Three '>{name}</span>
                      <span
                        className={cn(
                          'passflow-ml-auto passflow-text-body-2-medium passflow-text-Grey-Six',
                          'group-hover:!passflow-text-Dark-Three',
                        )}
                      >
                        +{dialCode}
                      </span>
                    </li>
                  );
                })}
                <p
                  className={cn(
                    'passflow-text-caption-1-medium passflow-text-Grey-Six passflow-mx-[12px] passflow-pb-[6px]',
                    'passflow-border-b passflow-border-GreySeven passflow-mb-[6px]',
                    {
                      'passflow-mt-[12px]': size(preferredCountries) > 0,
                    },
                  )}
                >
                  All contries
                </p>
              </>
            )}
            {filteredCountries.map((defCountry) => {
              const { name, dialCode, iso2 } = parseCountry(defCountry);
              return (
                <li
                  key={iso2}
                  title={name}
                  role='button'
                  onClick={() => handleChangeCountry(iso2)}
                  className={cn(
                    'passflow-group passflow-flex passflow-items-center passflow-justify-start passflow-bg-White',
                    'passflow-px-[12px] passflow-py-[7px] passflow-w-full passflow-max-h-[32px] hover:passflow-bg-Background',
                    'passflow-cursor-pointer',
                  )}
                >
                  <FlagImage iso2={iso2} className='passflow-w-[21px] passflow-h-[15px]' />
                  <span className='passflow-ml-[8px] passflow-text-body-2-medium passflow-text-Dark-Three'>{name}</span>
                  <span
                    className={cn(
                      'passflow-ml-auto passflow-text-body-2-medium passflow-text-Grey-Six',
                      'group-hover:!passflow-text-Dark-Three',
                    )}
                  >
                    +{dialCode}
                  </span>
                </li>
              );
            })}
            <div
              className={cn(
                'passflow-sticky passflow-bottom-0 passflow-left-0 passflow-w-full passflow-h-[10px] passflow-bg-White',
                'passflow-z-10 passflow-bg-White',
              )}
            />
          </>
        ) : (
          <span
            className={cn(
              'passflow-text-body-2-medium passflow-text-Grey-Six passflow-mx-auto passflow-py-[15px]',
              'passflow-text-center passflow-w-full passflow-block',
            )}
          >
            No matches
          </span>
        )}
      </ul>
    </div>
  );
};
