import { describe, expect, it } from 'vitest';
import { messages } from '../../i18n/messages';

const placeholders = (message: string) =>
  [...message.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();

describe('translation catalog', () => {
  it('keeps English and Thai keys in sync', () => {
    expect(Object.keys(messages.th).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it('uses the same interpolation placeholders in both locales', () => {
    for (const key of Object.keys(messages.en) as Array<keyof typeof messages.en>) {
      expect(placeholders(messages.th[key]), key).toEqual(placeholders(messages.en[key]));
    }
  });

  it('does not contain blank translations', () => {
    for (const locale of Object.values(messages)) {
      expect(Object.values(locale).every((message) => message.trim().length > 0)).toBe(true);
    }
  });
});
