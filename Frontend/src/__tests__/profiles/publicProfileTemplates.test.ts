import { describe, expect, it } from 'vitest';
import { getProfileTemplate, profileTemplates } from '../../styles/publicProfileTemplates';

const luminance = (hex: string) => {
  const channels = hex.slice(1).match(/.{2}/g)!.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrast = (foreground: string, background: string) => {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

describe('public profile templates', () => {
  it('keeps all four original themes and exposes exactly eight unique keys', () => {
    const keys = profileTemplates.map((template) => template.key);
    expect(keys.slice(0, 4)).toEqual([
      'soft-mint',
      'lavender-studio',
      'warm-editorial',
      'night-signal',
    ]);
    expect(keys).toHaveLength(8);
    expect(new Set(keys).size).toBe(8);
    expect(keys.every((key) => key.length <= 32)).toBe(true);
  });

  it('falls back to Soft Mint for old records with an unknown key', () => {
    expect(getProfileTemplate('retired-theme').key).toBe('soft-mint');
  });

  it('keeps primary CTA text at WCAG AA contrast', () => {
    for (const template of profileTemplates) {
      expect(contrast(template.accentText, template.accent), template.key).toBeGreaterThanOrEqual(4.5);
    }
  });
});
