import flags from '@/assets/icons/flags.png';
import { cn } from '@/utils';
import type { CSSProperties, FC } from 'react';
import { COUNTRY_FLAG_POSITIONS, type SupportedCountryFlag } from './positions';
import './style.css';

export type CountryFlagProps = {
  iso2: string;
  className?: string;
};

const COUNTRY_FLAG_ALIASES: Record<string, SupportedCountryFlag> = {
  bq: 'nl',
  gf: 'fr',
  gp: 'fr',
  io: 'gb',
  pm: 'fr',
  re: 'fr',
  yt: 'fr',
};

const getSupportedCountry = (iso2: string): SupportedCountryFlag | null => {
  const normalized = iso2.trim().toLowerCase();
  const candidate = COUNTRY_FLAG_ALIASES[normalized] ?? normalized;
  return candidate in COUNTRY_FLAG_POSITIONS ? (candidate as SupportedCountryFlag) : null;
};

export const CountryFlag: FC<CountryFlagProps> = ({ iso2, className }) => {
  const country = getSupportedCountry(iso2);

  if (!country) {
    return (
      <span
        aria-hidden='true'
        className={cn('passflow-country-flag passflow-country-flag--fallback', className)}
        data-country-flag={iso2.toLowerCase()}
      >
        {iso2.slice(0, 2).toUpperCase() || '–'}
      </span>
    );
  }

  const style: CSSProperties = {
    backgroundImage: `url(${flags})`,
    backgroundPosition: COUNTRY_FLAG_POSITIONS[country],
  };

  return (
    <span
      aria-hidden='true'
      className={cn('passflow-country-flag', className)}
      data-country-flag={iso2.toLowerCase()}
      style={style}
    />
  );
};
