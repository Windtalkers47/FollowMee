import { ThemeProvider, createTheme } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileShareCenter from '../../components/PublicProfile/ProfileShareCenter';
import type { PublicProfileRecord } from '../../types/publicProfile.types';
import { messages } from '../../i18n/messages';

vi.mock('../../contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => ({
    t: (key: keyof typeof messages.en) => messages.en[key] || key,
    profileCardMotion: 'off',
  }),
}));

vi.mock('../../components/PublicProfile/ProfileShareShowcase', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef<HTMLDivElement, { format: string }>((props, ref) => (
      <div ref={ref} data-testid={`showcase-${props.format}`} />
    )),
  };
});

vi.mock('../../components/PublicProfile/ProfileQrShowcase', async () => {
  const React = await import('react');
  return {
    profileQrDimensions: { width: 720, height: 720 },
    default: React.forwardRef<HTMLDivElement>((_, ref) => <div ref={ref} data-testid="branded-qr-card" />),
  };
});

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,cXI=') },
}));

const profile: PublicProfileRecord = {
  profileId: 'profile-1', userId: 1, customerId: null, slug: 'coca', displayName: 'Coca',
  headline: null, bio: null, avatarUrl: null, templateKey: 'soft-mint', themeConfig: null,
  status: 'published', visibility: 'public', primaryCtaLabel: null, primaryCtaUrl: null,
  secondaryCtaLabel: null, secondaryCtaUrl: null, showEmail: false, showPhone: false,
  showAddress: false, seoTitle: null, seoDescription: null, viewCount: 0, publishedAt: null,
  createdAt: '', updatedAt: '', links: [],
};

const renderCenter = () => render(
  <ThemeProvider theme={createTheme()}>
    <ProfileShareCenter open onClose={vi.fn()} profile={profile} publicUrl="https://example.com/p/coca" />
  </ThemeProvider>,
);

describe('ProfileShareCenter', () => {
  it('opens in link mode and shows only link actions', () => {
    renderCenter();
    expect(screen.getByTestId('share-mode-link')).toBeInTheDocument();
    expect(screen.queryByTestId('share-mode-qr')).not.toBeInTheDocument();
    expect(screen.queryByTestId('share-mode-image')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download PNG' })).not.toBeInTheDocument();
  });

  it('shows one direct size choice and an exact clean preview', () => {
    renderCenter();
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    expect(screen.getByTestId('share-mode-image')).toBeInTheDocument();
    expect(screen.getByTestId('exact-share-image-preview')).toHaveAttribute('data-format', 'square');
    expect(screen.getAllByTestId('showcase-square')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Square' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Download output')).not.toBeInTheDocument();
    expect(screen.queryByText('Customize image')).not.toBeInTheDocument();
    expect(screen.queryByText('Premium phone')).not.toBeInTheDocument();
    expect(screen.queryByText('Clean card')).not.toBeInTheDocument();
  });

  it('updates the same preview/export node when the image size changes', () => {
    renderCenter();
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Story' }));

    expect(screen.getByTestId('exact-share-image-preview')).toHaveAttribute('data-format', 'story');
    expect(screen.getAllByTestId('showcase-story')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Story' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches modes without mixing their primary actions', async () => {
    renderCenter();
    fireEvent.click(screen.getByRole('tab', { name: 'QR code' }));
    expect(screen.getByTestId('share-mode-qr')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download QR code' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('branded-qr-card')).toBeInTheDocument());
    expect(screen.getAllByTestId('branded-qr-card')).toHaveLength(1);
  });
});
