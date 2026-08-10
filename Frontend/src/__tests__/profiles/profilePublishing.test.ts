import { describe, expect, it } from 'vitest';
import { getMissingPublishingFields } from '../../utils/profilePublishing';

const profile = (patch: Record<string, unknown> = {}) => ({ displayName: 'Customer', slug: 'customer-card', primaryCtaLabel: 'Website', primaryCtaUrl: 'https://example.com', links: [], ...patch } as any);

describe('profile publishing validation', () => {
  it('does not require avatar, bio, SEO or visibility', () => expect(getMissingPublishingFields(profile())).toEqual([]));
  it('returns actionable field keys', () => expect(getMissingPublishingFields(profile({ displayName: '', slug: 'Bad URL', primaryCtaUrl: '' }))).toEqual(['display_name', 'slug', 'primary_link']));
  it('accepts a visible link when CTA is empty', () => expect(getMissingPublishingFields(profile({ primaryCtaLabel: '', primaryCtaUrl: '', links: [{ isVisible: true, url: 'mailto:test@example.com' }] }))).toEqual([]));
});
