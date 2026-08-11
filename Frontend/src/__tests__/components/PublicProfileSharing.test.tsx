import { ThemeProvider, createTheme } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PublicProfilePage from '../../pages/CustomerProfile/PublicProfilePage';
import { messages } from '../../i18n/messages';

vi.mock('../../contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => ({
    t: (key: keyof typeof messages.en) => messages.en[key] || key,
    profileCardMotion: 'off',
  }),
}));

vi.mock('../../api/publicProfile.api', () => ({
  publicProfileApi: {
    getPublic: vi.fn().mockResolvedValue({
      profileId: 'profile-1', slug: 'sample', displayName: 'Sample', headline: 'Headline', bio: null,
      avatarUrl: null, templateKey: 'night-signal', themeConfig: null,
      primaryCtaLabel: null, primaryCtaUrl: null, secondaryCtaLabel: null, secondaryCtaUrl: null,
      email: null, phone: null, address: null, links: [], seoTitle: 'Sample', seoDescription: null, publishedAt: null,
    }),
    recordEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../components/PublicProfile/ProfileLandingCard', () => ({
  default: () => <div data-testid="public-landing-card" />,
}));

vi.mock('../../components/PublicProfile/ProfileShareCenter', () => ({
  default: ({ open, initialMode }: { open: boolean; initialMode: string }) => open
    ? <div data-testid="public-share-center" data-mode={initialMode} />
    : null,
}));

describe('Public profile sharing', () => {
  it('opens the unified image flow instead of capturing the live landing DOM', async () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter initialEntries={['/p/sample']}>
          <Routes><Route path="/p/:slug" element={<PublicProfilePage />} /></Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('public-landing-card')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save as image' }));
    expect(screen.getByTestId('public-share-center')).toHaveAttribute('data-mode', 'image');
  });
});
