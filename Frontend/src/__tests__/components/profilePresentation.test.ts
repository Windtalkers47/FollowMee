import { describe, expect, it } from 'vitest';
import { profileTemplates } from '../../styles/publicProfileTemplates';
import type { PublicProfileLanding } from '../../types/publicProfile.types';
import {
  getProfilePresentation,
  resolveProfileAppearance,
} from '../../components/PublicProfile/profilePresentation';

const makeProfile = (overrides: Partial<PublicProfileLanding> = {}): PublicProfileLanding => ({
  profileId: 'profile-1',
  slug: 'sample',
  displayName: 'Sample Profile',
  headline: 'A useful headline',
  bio: 'Longer biography',
  avatarUrl: null,
  templateKey: 'soft-mint',
  themeConfig: null,
  primaryCtaLabel: 'Book now',
  primaryCtaUrl: 'https://example.com/book',
  secondaryCtaLabel: null,
  secondaryCtaUrl: null,
  email: 'private@example.com',
  phone: '000',
  address: 'Private address',
  links: [],
  seoTitle: 'Sample',
  seoDescription: null,
  publishedAt: null,
  ...overrides,
});

describe('profile presentation', () => {
  it.each(profileTemplates)('resolves the complete $name appearance from one canonical source', (template) => {
    expect(resolveProfileAppearance(makeProfile({ templateKey: template.key }))).toMatchObject({
      background: template.background,
      surface: template.surface,
      text: template.text,
      muted: template.muted,
      accent: template.accent,
      accentText: template.accentText,
      radius: template.radius,
    });
  });

  it('applies custom appearance overrides and selects readable accent text', () => {
    const appearance = resolveProfileAppearance(makeProfile({
      templateKey: 'night-signal',
      themeConfig: {
        backgroundColor: '#101820',
        surfaceColor: '#17242D',
        textColor: '#F7FBFF',
        accentColor: '#FFF100',
        fontStyle: 'editorial',
      },
    }));

    expect(appearance).toMatchObject({
      background: '#101820',
      surface: '#17242D',
      text: '#F7FBFF',
      accent: '#FFF100',
      accentText: '#07120A',
    });
    expect(appearance.fontFamily).toContain('Georgia');
  });

  it('builds only intentional share content and limits visible links to four', () => {
    const presentation = getProfilePresentation(makeProfile({
      links: Array.from({ length: 6 }, (_, index) => ({
        linkId: index + 1,
        platform: 'website',
        label: `Link ${index + 1}`,
        url: `https://example.com/${index + 1}`,
        sortOrder: 5 - index,
        isVisible: index !== 1,
      })),
    }));

    expect(presentation.links).toHaveLength(4);
    expect(presentation.links.map((link) => link.label)).toEqual(['Link 6', 'Link 5', 'Link 4', 'Link 3']);
    expect(presentation).not.toHaveProperty('email');
    expect(presentation).not.toHaveProperty('phone');
    expect(presentation).not.toHaveProperty('address');
  });
});
