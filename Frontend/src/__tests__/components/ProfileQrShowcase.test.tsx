import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileQrShowcase from '../../components/PublicProfile/ProfileQrShowcase';
import type { PublicProfileLanding } from '../../types/publicProfile.types';
import { messages } from '../../i18n/messages';

vi.mock('../../contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => ({
    t: (key: keyof typeof messages.en, values?: Record<string, string>) => {
      if (key === 'profile.public.qrAlt') return `QR code for ${values?.name}`;
      return messages.en[key] || key;
    },
  }),
}));

const profile: PublicProfileLanding = {
  profileId: 'profile-1', slug: 'sample', displayName: 'Sample Profile', headline: null, bio: null,
  avatarUrl: null, templateKey: 'night-signal', themeConfig: null,
  primaryCtaLabel: null, primaryCtaUrl: null, secondaryCtaLabel: null, secondaryCtaUrl: null,
  email: 'private@example.com', phone: '000000', address: 'Private address', links: [],
  seoTitle: 'Sample', seoDescription: null, publishedAt: null,
};

describe('ProfileQrShowcase', () => {
  it('renders a branded square QR card from the selected appearance without private contact data', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <ProfileQrShowcase
          profile={profile}
          publicUrl="https://example.com/p/sample"
          qrDataUrl="data:image/png;base64,cXI="
        />
      </ThemeProvider>,
    );

    const card = screen.getByTestId('profile-qr-showcase');
    expect(card).toHaveStyle({ width: '720px', height: '720px' });
    expect(card).toHaveAttribute('data-template', 'night-signal');
    expect(screen.getByRole('img', { name: 'QR code for Sample Profile' })).toBeInTheDocument();
    expect(screen.getByText('example.com/p/sample')).toBeInTheDocument();
    expect(screen.queryByText(profile.email!)).not.toBeInTheDocument();
    expect(screen.queryByText(profile.phone!)).not.toBeInTheDocument();
    expect(screen.queryByText(profile.address!)).not.toBeInTheDocument();
  });
});
