import { formatDistanceToNow } from 'date-fns';
import { enUS, th } from 'date-fns/locale';
import type { Locale } from '../services/userPreferences.api';

const localeTag = (locale: Locale) =>
  locale === 'th' ? 'th-TH-u-ca-gregory-nu-latn' : 'en-US';

export const formatLocalizedDate = (
  value: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
) => new Intl.DateTimeFormat(localeTag(locale), options).format(new Date(value));

export const formatLocalizedNumber = (
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(localeTag(locale), options).format(value);

export const formatLocalizedTime = (
  value: Date | string | number,
  locale: Locale,
) => new Intl.DateTimeFormat(localeTag(locale), { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export const formatLocalizedRelativeTime = (
  value: Date | string | number,
  locale: Locale,
) => formatDistanceToNow(new Date(value), {
  addSuffix: true,
  locale: locale === 'th' ? th : enUS,
});

export const formatLocalizedWeekday = (weekday: number, locale: Locale) => {
  const normalized = ((weekday % 7) + 7) % 7;
  return new Intl.DateTimeFormat(localeTag(locale), { weekday: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, 7, 2 + normalized)));
};

export const getLocaleTag = localeTag;
