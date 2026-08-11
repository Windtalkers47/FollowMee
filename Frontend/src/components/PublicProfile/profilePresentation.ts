import { alpha, getContrastRatio } from '@mui/material/styles';
import type { PublicProfileLanding, PublicProfileRecord } from '../../types/publicProfile.types';
import { getProfileTemplate } from '../../styles/publicProfileTemplates';

export type ProfilePresentationSource = PublicProfileLanding | PublicProfileRecord;

export interface ResolvedProfileAppearance {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  radius: number;
  fontFamily: string;
}

const fontFamilies = {
  modern: 'inherit',
  friendly: '"Segoe UI", "Noto Sans Thai", sans-serif',
  editorial: 'Georgia, "Noto Serif Thai", serif',
} as const;

const safeAlpha = (color: string, opacity: number, fallback: string) => {
  try {
    return alpha(color, opacity);
  } catch {
    return fallback;
  }
};

const mostReadable = (background: string, preferred: string) => {
  try {
    if (getContrastRatio(preferred, background) >= 4.5) return preferred;
    return getContrastRatio('#FFFFFF', background) >= getContrastRatio('#111511', background)
      ? '#FFFFFF'
      : '#111511';
  } catch {
    return preferred;
  }
};

export const resolveProfileAppearance = (profile: ProfilePresentationSource): ResolvedProfileAppearance => {
  const preset = getProfileTemplate(profile.templateKey);
  const theme = profile.themeConfig;
  const text = theme?.textColor || preset.text;
  const accent = theme?.accentColor || preset.accent;

  return {
    background: theme?.backgroundColor || preset.background,
    surface: theme?.surfaceColor || preset.surface,
    text,
    muted: theme?.textColor ? safeAlpha(text, 0.7, preset.muted) : preset.muted,
    accent,
    accentText: theme?.accentColor ? mostReadable(accent, preset.accentText) : preset.accentText,
    radius: preset.radius,
    fontFamily: fontFamilies[theme?.fontStyle || 'modern'],
  };
};

export const getProfileInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
};

export const getProfilePresentation = (profile: ProfilePresentationSource) => ({
  displayName: profile.displayName.trim(),
  summary: profile.headline?.trim() || profile.bio?.trim() || '',
  avatarUrl: profile.avatarUrl,
  imageCrop: profile.imageCrop,
  primaryAction: profile.primaryCtaLabel?.trim()
    ? { key: 'primary', label: profile.primaryCtaLabel.trim(), primary: true as const }
    : null,
  links: profile.links
    .filter((link) => link.isVisible !== false && link.label.trim())
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, 4)
    .map((link) => ({
      key: String(link.linkId || `${link.platform}-${link.sortOrder}`),
      label: link.label.trim(),
      platform: link.platform,
      primary: false as const,
    })),
});
