import { Box, Button, Stack } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink } from 'react-router-dom';
import ProfileLandingCard from '../../components/PublicProfile/ProfileLandingCard';
import type { PublicProfileLanding } from '../../types/publicProfile.types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

const demo: PublicProfileLanding = {
  profileId: 'demo', slug: 'demo', displayName: 'FollowMee Studio', headline: 'A calmer way to share your story',
  bio: 'A focused social profile with one clear next step, useful links and measurable engagement.', avatarUrl: null, imageCrop: null,
  templateKey: 'soft-mint', themeConfig: null, primaryCtaLabel: 'Start a conversation', primaryCtaUrl: 'https://example.com/contact',
  secondaryCtaLabel: null, secondaryCtaUrl: null, email: null, phone: null, address: null,
  links: [{ linkId: 1, platform: 'website', label: 'Visit our website', url: 'https://example.com', sortOrder: 0, isVisible: true }],
  seoTitle: 'FollowMee Studio', seoDescription: 'Interactive FollowMee profile demo', publishedAt: null,
};

export default function DemoProfilePage() {
  const { t } = useUserPreferences();
  return <Box component="main" minHeight="100svh" sx={{ bgcolor: '#0B100E', py: 3, px: 2 }}>
    <Stack direction="row" justifyContent="space-between" maxWidth={680} mx="auto" mb={2}>
      <Button component={RouterLink} to="/" startIcon={<ArrowBackRounded />} sx={{ color: 'white' }}>{t('landing.back')}</Button>
      <Button component={RouterLink} to="/register?returnTo=%2Fcustomer-profile%2Fnew" variant="contained">{t('landing.create')}</Button>
    </Stack>
    <Box maxWidth={680} mx="auto"><ProfileLandingCard profile={demo} preview /></Box>
  </Box>;
}
