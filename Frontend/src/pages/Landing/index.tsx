import { useEffect } from 'react';
import { Box, Button, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import PlayCircleOutlineRounded from '@mui/icons-material/PlayCircleOutlineRounded';
import { useAppSelector } from '../../store/store';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import ProfileLandingCard from '../../components/PublicProfile/ProfileLandingCard';
import type { PublicProfileLanding } from '../../types/publicProfile.types';
import { recordProductFunnel } from '../../utils/productFunnel';

export default function LandingPage() {
  const authenticated = useAppSelector(state => state.auth.isAuthenticated);
  const { t } = useUserPreferences();
  const createPath = authenticated ? '/customer-profile/new' : '/register?returnTo=%2Fcustomer-profile%2Fnew';
  useEffect(() => { recordProductFunnel('landing_view'); }, []);
  const landingPreview: PublicProfileLanding = {
    profileId: 'landing-demo', slug: 'demo', displayName: t('landing.previewName'),
    headline: t('landing.previewHeadline'), bio: t('landing.previewBio'),
    avatarUrl: null, imageCrop: null, templateKey: 'soft-mint', themeConfig: null,
    primaryCtaLabel: t('landing.previewCta'), primaryCtaUrl: '#demo-contact', secondaryCtaLabel: null, secondaryCtaUrl: null,
    email: null, phone: null, address: null,
    links: [{ linkId: 1, platform: 'website', label: t('landing.previewLink'), url: '#demo-link', sortOrder: 0, isVisible: true }],
    seoTitle: t('landing.previewName'), seoDescription: t('landing.previewBio'), publishedAt: null,
  };
  return <Box component="main" minHeight="100svh" sx={{ bgcolor: 'background.default', py: { xs: 3, md: 7 } }}>
    <Container maxWidth="lg">
      <Stack component="header" direction="row" justifyContent="space-between" alignItems="center" mb={{ xs: 5, md: 7 }}>
        <Typography fontWeight={900} color="primary.main">FollowMee</Typography>
        {!authenticated && <Link component={RouterLink} to="/login" underline="none" fontWeight={750}>{t('auth.login.signIn')}</Link>}
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 5, md: 9 }} alignItems="center">
        <Box flex={1}>
          <Typography variant="overline" color="primary.main" fontWeight={900}>{t('landing.eyebrow')}</Typography>
          <Typography component="h1" variant="h2" fontWeight={900} sx={{ mt: 1, maxWidth: 720 }}>{t('landing.title')}</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ my: 3, maxWidth: 660 }}>{t('landing.subtitle')}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to={createPath} onClick={() => recordProductFunnel('registration_started')} variant="contained" size="large" endIcon={<ArrowForwardRounded />}>{t('landing.create')}</Button>
            <Button component={RouterLink} to="/demo/profile" onClick={() => recordProductFunnel('demo_open')} variant="outlined" size="large" startIcon={<PlayCircleOutlineRounded />}>{t('landing.demo')}</Button>
          </Stack>
        </Box>
        <Box component={RouterLink} to="/demo/profile" onClick={() => recordProductFunnel('demo_open')} aria-label={t('landing.openPreviewCard')} sx={{ width: { xs: '100%', md: 420 }, maxHeight: 560, overflow: 'hidden', borderRadius: 6, textDecoration: 'none', boxShadow: '0 28px 70px rgba(31,25,34,.15)', transition: 'transform 180ms ease', '&:hover': { transform: 'translateY(-4px)' } }}>
          <Box sx={{ transform: 'scale(.72)', transformOrigin: 'top center', width: '138.9%', ml: '-19.45%', mb: '-270px', pointerEvents: 'none' }}>
            <ProfileLandingCard profile={landingPreview} interactionMode="editor-preview" disableMotion />
          </Box>
        </Box>
      </Stack>
    </Container>
  </Box>;
}
