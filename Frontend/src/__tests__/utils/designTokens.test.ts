import { describe, expect, it } from 'vitest';
import { brandThemeTokens } from '../../styles/designTokens';

const channel = (hex: string, offset: number) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

const luminance = (hex: string) => {
  const linear = (value: number) => (value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return (
    0.2126 * linear(channel(hex, 1))
    + 0.7152 * linear(channel(hex, 3))
    + 0.0722 * linear(channel(hex, 5))
  );
};

const contrast = (foreground: string, background: string) => {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
};

describe('FollowMee semantic theme tokens', () => {
  it.each(['purple', 'green'] as const)('%s light theme keeps text and CTA at WCAG AA contrast', (brand) => {
    const tokens = brandThemeTokens[brand].light;
    expect(contrast(tokens.text, tokens.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens.secondaryText, tokens.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', tokens.action)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['purple', 'green'] as const)('%s dark theme uses tinted charcoal with accessible text and CTA', (brand) => {
    const tokens = brandThemeTokens[brand].dark;
    expect(tokens.page).not.toBe('#000000');
    expect(contrast(tokens.text, tokens.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens.secondaryText, tokens.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens.page, tokens.action)).toBeGreaterThanOrEqual(4.5);
  });
});
