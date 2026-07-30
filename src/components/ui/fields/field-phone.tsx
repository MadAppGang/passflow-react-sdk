import { useOutsideClick } from '@/hooks';
import { cn } from '@/utils';
import { getCountryForTimezone } from 'countries-and-timezones';
import { eq, size } from 'lodash';
import {
  type ChangeEvent,
  type FC,
  type InputHTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type CountryIso2, defaultCountries, parseCountry, usePhoneInput } from 'react-international-phone';
import { Button, CountryFlag, Icon } from '..';

import '@/styles/index.css';
import 'react-international-phone/style.css';
import React from 'react';

type TFieldPhone = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isError?: boolean;
  className?: string;
  // eslint-disable-next-line react/no-unused-prop-types
  ref?: null;
};

export const FieldPhone: FC<TFieldPhone> = ({
  id,
  name,
  onChange,
  isError = false,
  className = '',
  disabled = false,
  ...inputProps
}) => {
  const [show, setShow] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const refWrapper = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) searchInputRef.current?.focus();
  }, [show]);

  useOutsideClick(refWrapper, () => {
    setShow(false);
    setFilterValue('');
  });

  const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userCountry = getCountryForTimezone(userTZ);
  const { inputValue, country, setCountry, handlePhoneValueChange, inputRef } = usePhoneInput({
    defaultCountry: userCountry?.id.toLocaleLowerCase() || 'us',
  });

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    handlePhoneValueChange(event);
    onChange(event);
  };

  const filteredCountries = useMemo(
    () =>
      defaultCountries.filter((defCountry) => {
        const { name: countryName } = parseCountry(defCountry);
        return countryName.toLowerCase().includes(filterValue.toLowerCase());
      }),
    [filterValue],
  );

  const preferredCountries = useMemo(
    () =>
      defaultCountries.filter((defCountry) => {
        const { iso2 } = parseCountry(defCountry);
        return eq(iso2, userCountry?.id.toLocaleLowerCase());
      }),
    [userCountry?.id],
  );

  const allCountries = useMemo(() => {
    if (filterValue) return filteredCountries;
    const preferredIso = new Set(preferredCountries.map((defCountry) => parseCountry(defCountry).iso2));
    return filteredCountries.filter((defCountry) => !preferredIso.has(parseCountry(defCountry).iso2));
  }, [filterValue, filteredCountries, preferredCountries]);

  const restoreCountryButtonFocus = () => {
    refWrapper.current?.querySelector<HTMLButtonElement>('.passflow-button-show-country')?.focus();
  };

  const handleShow = () => setShow(true);

  const handleClose = (restoreFocus = false) => {
    setShow(false);
    setFilterValue('');
    if (restoreFocus) restoreCountryButtonFocus();
  };

  const handleChangeCountry = (iso2: CountryIso2) => {
    setCountry(iso2);
    handleClose(true);
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLDivElement>, iso2: CountryIso2) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleChangeCountry(iso2);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const options = Array.from(refWrapper.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const currentIndex = options.indexOf(event.currentTarget);
    const nextIndex =
      event.key === 'ArrowDown' ? Math.min(currentIndex + 1, options.length - 1) : Math.max(currentIndex - 1, 0);
    options[nextIndex]?.focus();
  };

  const renderCountry = (defCountry: (typeof defaultCountries)[number]) => {
    const { name: countryName, dialCode, iso2 } = parseCountry(defCountry);
    return (
      <div
        key={iso2}
        role='option'
        aria-selected={iso2 === country.iso2}
        tabIndex={0}
        title={countryName}
        onClick={() => handleChangeCountry(iso2)}
        onKeyDown={(event) => handleOptionKeyDown(event, iso2)}
        className='passflow-country-search-item'
      >
        <CountryFlag iso2={iso2} className='passflow-country-search-flag' />
        <span className='passflow-country-search-name'>{countryName}</span>
        <span className='passflow-country-search-code'>+{dialCode}</span>
      </div>
    );
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
      <Button
        type='button'
        variant='clean'
        onClick={() => (show ? handleClose(true) : handleShow())}
        size='big'
        className='passflow-button-show-country'
        disabled={disabled}
        aria-label={`Select country, current ${country.iso2.toUpperCase()}`}
        aria-haspopup='listbox'
        aria-expanded={show}
        aria-controls='passflow-country-options'
      >
        <CountryFlag iso2={country.iso2} />
        <Icon type='general' id='caret-down' size='small' />
      </Button>

      {!show ? (
        <input
          {...inputProps}
          id={id}
          name={name}
          ref={inputRef}
          type='tel'
          value={inputValue}
          disabled={disabled}
          aria-invalid={isError}
          onChange={handlePhoneChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className='passflow-field-phone-input'
        />
      ) : (
        <div className='passflow-field-country-search-wrapper'>
          <input
            ref={searchInputRef}
            role='combobox'
            aria-label='Search countries'
            aria-expanded='true'
            aria-controls='passflow-country-options'
            aria-autocomplete='list'
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') handleClose(true);
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                refWrapper.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
              }
            }}
            className='passflow-field-country-search'
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder='Search for a country'
          />
          <div className='passflow-field-country-search-icon'>
            <Icon type='general' id='search' size='small' />
          </div>
        </div>
      )}

      <div
        id='passflow-country-options'
        role='listbox'
        tabIndex={-1}
        aria-label='Countries'
        aria-hidden={!show}
        className={cn('passflow-country-search-wrapper', {
          'passflow-country-search-wrapper--show': show,
          'passflow-country-search-wrapper--hidden': !show,
          'passflow-country-search-wrapper--without-preferred': !!filterValue || preferredCountries.length === 0,
        })}
      >
        {size(filteredCountries) > 0 ? (
          <>
            <div role='presentation' aria-hidden='true' className='passflow-country-search-sticky-top' />
            {!filterValue && preferredCountries.length > 0 ? (
              <>
                {preferredCountries.map(renderCountry)}
                <div role='presentation' className='passflow-country-search-divider'>
                  All countries
                </div>
              </>
            ) : null}
            {allCountries.map(renderCountry)}
            <div role='presentation' aria-hidden='true' className='passflow-country-search-sticky-bottom' />
          </>
        ) : (
          <div role='presentation' className='passflow-country-search-no-matches'>
            No matches
          </div>
        )}
      </div>
    </div>
  );
};
