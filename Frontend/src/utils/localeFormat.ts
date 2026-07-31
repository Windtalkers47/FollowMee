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

export const formatLocalizedRelativeTime = (
  value: Date | string | number,
  locale: Locale,
) => formatDistanceToNow(new Date(value), {
  addSuffix: true,
  locale: locale === 'th' ? th : enUS,
});

export const getLocaleTag = localeTag;
