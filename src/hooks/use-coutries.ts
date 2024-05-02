import { countriesPhoneCode } from '@/constants';
import { type Country, getAllCountries, getCountryForTimezone } from 'countries-and-timezones';

interface CoutryWithPhoneCode extends Country {
  phoneCode: string | null;
}

export type TuseCountries = () => {
  prefCountryWithPhoneCode: CoutryWithPhoneCode;
  allCountriesWithPhoneCode: CoutryWithPhoneCode[];
};

export const useCountries: TuseCountries = () => {
  const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const prefCountry = getCountryForTimezone(userTZ);
  const allCountries = getAllCountries();

  const prefCountryWithPhoneCode = {
    ...prefCountry,
    phoneCode: prefCountry ? countriesPhoneCode[prefCountry.id] : null,
  } as CoutryWithPhoneCode;
  const allCountriesWithPhoneCode = { ...allCountries } as Record<keyof typeof allCountries, CoutryWithPhoneCode>;

  Object.keys(allCountries).forEach((country) => {
    allCountriesWithPhoneCode[country as keyof typeof allCountries].phoneCode =
      countriesPhoneCode[country as keyof typeof countriesPhoneCode];
  });

  return { prefCountryWithPhoneCode, allCountriesWithPhoneCode: Object.values(allCountriesWithPhoneCode) };
};
