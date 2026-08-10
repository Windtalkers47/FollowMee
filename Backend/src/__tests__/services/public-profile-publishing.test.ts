import { getPublicProfilePublishingChecklist } from '../../services/public-profile.service';

const profile = (patch: Record<string, unknown> = {}) => ({
  displayName: 'Sample customer', slug: 'sample-customer', primaryCtaLabel: 'Visit website', primaryCtaUrl: 'https://example.com', links: [], ...patch,
} as any);

describe('public profile publishing checklist', () => {
  it('does not require avatar, bio, social links or visibility', () => {
    expect(getPublicProfilePublishingChecklist(profile()).every(item => item.complete)).toBe(true);
  });
  it('requires a valid CTA or visible link', () => {
    expect(getPublicProfilePublishingChecklist(profile({ primaryCtaUrl: 'javascript:alert(1)' })).find(item => item.key === 'primary_link')?.complete).toBe(false);
  });
  it('accepts a visible telephone link', () => {
    expect(getPublicProfilePublishingChecklist(profile({ primaryCtaLabel: null, primaryCtaUrl: null, links: [{ isVisible: true, url: 'tel:+6612345678' }] })).find(item => item.key === 'primary_link')?.complete).toBe(true);
  });
});
