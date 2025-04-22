import { useOutsideClick } from '@/hooks';
import { cn } from '@/utils';
import { getCountryForTimezone } from 'countries-and-timezones';
import { eq, size } from 'lodash';
/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { type ChangeEvent, type FC, type InputHTMLAttributes, useMemo, useRef, useState } from 'react';
import { type CountryIso2, FlagImage, defaultCountries, parseCountry, usePhoneInput } from 'react-international-phone';
import { Button, Icon } from '..';

import '@/styles/index.css';
import 'react-international-phone/style.css';
import React from 'react';

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
        'passflow-field-phone-wrapper',
        { 'passflow-field-phone-wrapper--focus': isFocused, 'passflow-field-phone-wrapper--error': isError },
        className,
      )}
    >
      {!show ? (
        <>
          <Button type='button' variant='clean' onClick={handleShow} size='big' className={cn('passflow-button-show-country')}>
            <FlagImage iso2={country.iso2} className='passflow-flag' style={{ width: '21px' }} />
            <Icon type='general' id='caret-down' size='small' />
          </Button>
          <input
            id={id}
            ref={inputRef}
            value={inputValue}
            onChange={handlePhoneChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn('passflow-field-phone-input')}
          />
        </>
      ) : (
        <div className={cn('passflow-field-country-search-wrapper')}>
          <input
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className={cn('passflow-field-country-search')}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder='Search for a country'
          />
          <div className='passflow-field-country-search-icon'>
            <Icon type='general' id='search' size='small' />
          </div>
        </div>
      )}
      <ul
        className={cn('passflow-country-search-wrapper', {
          'passflow-country-search-wrapper--show': show,
          'passflow-country-search-wrapper--hidden': !show,
        })}
      >
        {size(filteredCountries) > 0 ? (
          <>
            <div className='passflow-country-search-sticky-top' />
            {size(filterValue) === 0 && (
              <>
                {preferredCountries.map((defCountry) => {
                  const { name, dialCode, iso2 } = parseCountry(defCountry);
                  return (
                    <li
                      key={iso2}
                      title={name}
                      onClick={() => handleChangeCountry(iso2)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleChangeCountry(iso2);
                        }
                      }}
                      className='passflow-country-search-item'
                    >
                      <FlagImage iso2={iso2} className='passflow-country-search-flag' />
                      <span className='passflow-country-search-name'>{name}</span>
                      <span className='passflow-country-search-code'>+{dialCode}</span>
                    </li>
                  );
                })}
                <p className='passflow-country-search-divider'>All contries</p>
              </>
            )}
            {filteredCountries.map((defCountry) => {
              const { name, dialCode, iso2 } = parseCountry(defCountry);
              return (
                <li
                  key={iso2}
                  title={name}
                  onClick={() => handleChangeCountry(iso2)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleChangeCountry(iso2);
                    }
                  }}
                  className='passflow-country-search-item'
                >
                  <FlagImage iso2={iso2} className='passflow-country-search-flag' />
                  <span className='passflow-country-search-name'>{name}</span>
                  <span className='passflow-country-search-code'>+{dialCode}</span>
                </li>
              );
            })}
            <div className='passflow-country-search-sticky-bottom' />
          </>
        ) : (
          <span className='passflow-country-search-no-matches'>No matches</span>
        )}
      </ul>
    </div>
  );
};
