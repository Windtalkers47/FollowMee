import { describe, expect, it } from 'vitest';
import {
  formatLocalizedDate,
  formatLocalizedNumber,
  getLocaleTag,
} from '../../utils/localeFormat';

describe('localized formatting', () => {
  const date = new Date('2026-09-30T00:00:00+07:00');

  it('uses Thai month names, Gregorian years and Latin digits', () => {
    expect(getLocaleTag('th')).toBe('th-TH-u-ca-gregory-nu-latn');
    expect(formatLocalizedDate(date, 'th')).toBe('30 ก.ย. 2026');
    expect(formatLocalizedNumber(123456, 'th')).toMatch(/[0-9]/);
    expect(formatLocalizedNumber(123456, 'th')).not.toMatch(/[๐-๙]/);
  });

  it('keeps the English presentation in en-US', () => {
    expect(formatLocalizedDate(date, 'en')).toBe('Sep 30, 2026');
  });
});
