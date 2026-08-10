import type { PublicProfileRecord } from '../types/publicProfile.types';

export type PublishingField = 'display_name' | 'slug' | 'primary_link';

export const getMissingPublishingFields = (profile: PublicProfileRecord): PublishingField[] => {
  const validUrl = (value?: string | null) => Boolean(value && /^(https?:\/\/|mailto:|tel:)/i.test(value));
  const missing: PublishingField[] = [];
  if (!profile.displayName.trim()) missing.push('display_name');
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(profile.slug)) missing.push('slug');
  if (!((profile.primaryCtaLabel?.trim() && validUrl(profile.primaryCtaUrl)) || profile.links.some(link => link.isVisible && validUrl(link.url)))) missing.push('primary_link');
  return missing;
};
