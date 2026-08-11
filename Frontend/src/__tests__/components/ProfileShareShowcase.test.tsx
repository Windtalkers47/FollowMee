import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileShareShowcase from '../../components/PublicProfile/ProfileShareShowcase';
import type { PublicProfileRecord } from '../../types/publicProfile.types';
import { messages } from '../../i18n/messages';

vi.mock('../../contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => ({
    t: (key: keyof typeof messages.en) => messages.en[key] || key,
  }),
}));

const profile: PublicProfileRecord = {
  profileId: 'profile-1', userId: 1, customerId: null, slug: 'coca', displayName: 'Coca Cola',
  headline: null, bio: 'A calm and useful customer story.', avatarUrl: null, templateKey: 'soft-mint', themeConfig: null,
  status: 'published', visibility: 'public', primaryCtaLabel: 'Book a call', primaryCtaUrl: 'https://example.com/book',
  secondaryCtaLabel: null, secondaryCtaUrl: null, showEmail: false, showPhone: false,
  showAddress: false, seoTitle: null, seoDescription: null, viewCount: 0, publishedAt: null,
  createdAt: '', updatedAt: '',
  links: [
    { linkId: 1, platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/coca', sortOrder: 0, isVisible: true },
    { linkId: 2, platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/coca', sortOrder: 1, isVisible: true },
    { linkId: 3, platform: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@coca', sortOrder: 2, isVisible: true },
    { linkId: 4, platform: 'x', label: 'X', url: 'https://x.com/coca', sortOrder: 3, isVisible: true },
    { linkId: 5, platform: 'website', label: 'Extra website', url: 'https://example.com', sortOrder: 4, isVisible: true },
    { linkId: 6, platform: 'website', label: 'Hidden link', url: 'https://example.com/private', sortOrder: 5, isVisible: false },
  ],
};

const renderCard = (format: 'square' | 'story' | 'landscape', candidate = profile) => render(
  <ThemeProvider theme={createTheme()}>
    <ProfileShareShowcase profile={candidate} format={format} />
  </ThemeProvider>,
);

describe('ProfileShareShowcase', () => {
  it.each([
    ['square', '540px', '540px'],
    ['story', '540px', '960px'],
    ['landscape', '800px', '450px'],
  ] as const)('renders the dedicated %s identity-card layout at export size', (format, width, height) => {
    renderCard(format);
    const card = screen.getByTestId(`profile-showcase-${format}`);
    expect(card).toHaveAttribute('data-layout', format);
    expect(card).toHaveStyle({ width, height });
    expect(screen.queryByText('Live preview')).not.toBeInTheDocument();
  });

  it('shows compact public identity content without leaking extra or hidden links', () => {
    renderCard('square');
    expect(screen.getByRole('heading', { name: 'Coca Cola' })).toBeInTheDocument();
    expect(screen.getByText('A calm and useful customer story.')).toBeInTheDocument();
    expect(screen.getByText('Book a call')).toBeInTheDocument();
    expect(screen.getAllByTestId('share-link-action')).toHaveLength(4);
    expect(screen.queryByText('Extra website')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden link')).not.toBeInTheDocument();
    expect(screen.getByTestId('share-brand-footer')).toHaveTextContent('MADE WITH FOLLOWMEE');
  });

  it('uses initials and bio when avatar and headline are unavailable', () => {
    renderCard('story');
    expect(screen.getByText('CC')).toBeInTheDocument();
    expect(screen.getByText(profile.bio!)).toBeInTheDocument();
  });

  it('keeps the selected dark appearance instead of replacing it with a pastel background', () => {
    renderCard('square', { ...profile, templateKey: 'night-signal' });
    const card = screen.getByTestId('profile-showcase-square');
    expect(card).toHaveAttribute('data-template', 'night-signal');
    expect(card.getAttribute('data-background')).toContain('#101512');
    expect(card).toHaveAttribute('data-text-color', '#F2F7F3');
  });

  it('keeps the footer in document flow and fits long action labels without single-line truncation', () => {
    renderCard('landscape', {
      ...profile,
      primaryCtaLabel: 'ติดต่อเพื่อขอรายละเอียดและนัดหมายเพิ่มเติม',
      links: profile.links.map((link) => ({ ...link, label: `${link.label} official customer channel` })),
    });

    expect(screen.getByTestId('share-brand-footer')).not.toHaveStyle({ position: 'absolute' });
    expect(screen.getByTestId('share-primary-action').querySelector('p')).toHaveStyle({ overflowWrap: 'anywhere' });
    expect(screen.getAllByTestId('share-link-action')).toHaveLength(4);
  });
});
