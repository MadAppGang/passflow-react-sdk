import { ChangeEvent, FC, InputHTMLAttributes, useEffect, useState } from 'react';
import { FormikErrors } from 'formik';
import { useCountries } from '@/hooks';
import { Button, Icon } from '..';
import '@/styles/index.css';
import { size } from 'lodash';
import { cn } from '@/utils';

type TFieldPhone = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  value: string;
  setValue: (
    field: string,
    value: string,
    shouldValidate?: boolean | undefined,
  ) => Promise<void | FormikErrors<{ identifier: string; password: string; phone: string; country: string }>>;
  isError?: boolean;
  className?: string;
  disabled?: boolean;
};

export const FieldPhone: FC<TFieldPhone> = ({ id, value, setValue, isError = false, className = '', disabled = false }) => {
  const { prefCountryWithPhoneCode, allCountriesWithPhoneCode } = useCountries();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(prefCountryWithPhoneCode ?? allCountriesWithPhoneCode[0]);
  const [searchValue, setSearchValue] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(allCountriesWithPhoneCode);

  const styles = {
    'aooth-field--warning': isError,
  };

  const dropDownStyle =
    // eslint-disable-next-line max-len
    'aooth-absolute aooth-top-full aooth-left-0 aooth-z-10 aooth-w-full aooth-bg-White aooth-rounded-b-[4px] aooth-max-h-[252px] aooth-overflow-auto aooth-pt-[8px] aooth-pb-[10px] aooth-shadow-[0_4px_10px_0_rgba(0,0,0,.08)]';
  const dropDownItemStyle =
    // eslint-disable-next-line max-len
    'group/item aooth-px-[12px] aooth-py-[7px] aooth-w-full aooth-flex aooth-items-center aooth-justify-between aooth-text-body-2-medium aooth-text-Grey-One aooth-cursor-pointer hover:aooth-bg-Background focus-visible:aooth-bg-Background focus-visible:aooth-outline-none focus-visible:aooth-text-Dark';

  const onOpenHandler = () => {
    setIsOpen((prev) => !prev);
    void setValue('phone', '');
  };

  const selectCountryHandler = (country: typeof selectedCountry) => {
    setSelectedCountry(country);
    void setValue('phone', country.phoneCode ?? '', true);
    setIsOpen((prev) => !prev);
    setSearchValue('');
    setFilteredCountries(allCountriesWithPhoneCode);
  };

  const onChangeSearchHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (e.target.value.length) {
      setFilteredCountries(() =>
        allCountriesWithPhoneCode.filter((country) => country.name.toLowerCase().includes(e.target.value.toLocaleLowerCase())),
      );
    } else setFilteredCountries(allCountriesWithPhoneCode);
  };
  const onChangePhoneHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const regex = /^[0-9+]+$/;
    if (regex.test(e.target.value.replace(' ', '').trim())) {
      void setValue('phone', e.target.value, true);
    }
  };

  useEffect(() => {
    if (size(value) < 1) void setValue('phone', selectedCountry.phoneCode ?? '', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='aooth-relative aooth-w-full'>
      <div className='aooth-relative aooth-w-full'>
        {isOpen ? (
          <>
            <input
              id='country'
              type='text'
              value={searchValue}
              onChange={onChangeSearchHandler}
              className={cn(styles, 'aooth-field aooth-field--focused aooth-pl-[35px]', className)}
              placeholder='Search for a country'
              disabled={disabled}
            />
            <Icon
              id='search'
              size='small'
              type='general'
              className='aooth-absolute aooth-top-1/2 aooth-left-[12px] -aooth-translate-y-1/2'
            />
            <div className={cn(dropDownStyle)}>
              {searchValue.length === 0 && prefCountryWithPhoneCode && (
                <>
                  <button
                    type='button'
                    key={`current-${prefCountryWithPhoneCode.id}`}
                    className={cn(dropDownItemStyle, 'hover/item:aooth-text-Dark')}
                    onClick={() => selectCountryHandler(prefCountryWithPhoneCode)}
                  >
                    <div
                      className={`aooth-flex aooth-items-center aooth-justify-start aooth-gap-[12px] 
                      aooth-text-Dark aooth-whitespace-nowrap aooth-overflow-ellipsis`}
                    >
                      <Icon id={prefCountryWithPhoneCode.id} size='small' type='flags' className='aooth-w-[21px]' />
                      <p className='aooth-text-Dark aooth-whitespace-nowrap aooth-overflow-ellipsis'>
                        {prefCountryWithPhoneCode.name}
                      </p>
                    </div>
                    {prefCountryWithPhoneCode.phoneCode}
                  </button>
                  <p
                    className={`aooth-mx-[12px] aooth-pt-[12px] aooth-pb-[6px] aooth-mb-[6px] aooth-border-b-[1px] 
                      aooth-border-b-solid aooth-border-b-Grey-Four aooth-text-caption-1-medium aooth-text-Grey-One`}
                  >
                    All countries
                  </p>
                </>
              )}
              {filteredCountries.length ? (
                filteredCountries.map((country) => (
                  <button
                    type='button'
                    key={country.id}
                    className={cn(dropDownItemStyle, 'hover/item:aooth-text-Dark')}
                    onClick={() => selectCountryHandler(country)}
                  >
                    <div className='aooth-flex aooth-items-center aooth-justify-start aooth-gap-[12px] aooth-max-w-full'>
                      <Icon id={country.id} size='small' type='flags' className='aooth-w-[21px] aooth-rounded-[2px]' />
                      <p
                        className={`aooth-text-Dark aooth-whitespace-nowrap aooth-max-w-[200px] 
                        aooth-overflow-hidden aooth-text-ellipsis`}
                      >
                        {country.name}
                      </p>
                    </div>
                    {country.phoneCode}
                  </button>
                ))
              ) : (
                <p className='aooth-text-center aooth-text-body-2-medium aooth-text-Grey-One aooth-pt-[7px] aooth-pb-[5px]'>
                  No matches
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <input
              id={id}
              type='tel'
              value={value}
              onChange={onChangePhoneHandler}
              className={cn(styles, 'aooth-field aooth-field--focused aooth-pl-[61px]', className)}
              disabled={disabled}
            />
            <Button
              size='small'
              type='button'
              variant='clean'
              className={`aooth-absolute aooth-top-1/2 aooth-left-[12px] -aooth-translate-y-1/2 
                aooth-max-w-max aooth-p-0 aooth-flex aooth-items-center aooth-justify-start aooth-gap-[4px] 
                aooth-bg-transparent`}
              disabled={disabled}
              onClick={onOpenHandler}
            >
              <Icon id={selectedCountry.id} size='small' type='flags' className='aooth-w-[21px]' />
              <Icon id='caret-down' size='small' type='general' />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
