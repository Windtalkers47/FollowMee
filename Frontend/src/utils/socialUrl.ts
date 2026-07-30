export type SocialNetwork = 'facebook' | 'instagram' | 'tiktok' | 'x' | 'line';

const hosts: Record<Exclude<SocialNetwork, 'line'>, string> = {
  facebook: 'https://facebook.com/',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  x: 'https://x.com/',
};

export const normalizeSocialUrl = (value: string | null | undefined, network: SocialNetwork): string | undefined => {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (network === 'line') {
    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
      } catch {
        return undefined;
      }
    }
    return `https://line.me/ti/p/${encodeURIComponent(raw.replace(/^@/, ''))}`;
  }
  if (!/^https?:\/\//i.test(raw) && !/^[\w.-]+(?:\/[^\s]*)?$/i.test(raw.replace(/^@/, ''))) return undefined;
  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `${hosts[network]}${raw.replace(/^@/, '')}`;
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};
