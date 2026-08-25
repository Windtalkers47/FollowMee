import { Alert, Box, Button, Collapse, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink } from 'react-router-dom';
import ProfileLandingCard from '../../components/PublicProfile/ProfileLandingCard';
import type { PublicProfileLanding } from '../../types/publicProfile.types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useState } from 'react';

export default function DemoProfilePage() {
  const { t } = useUserPreferences();
  const [contactOpen, setContactOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const demo: PublicProfileLanding = {
    profileId: 'demo', slug: 'demo', displayName: t('landing.previewName'), headline: t('landing.previewHeadline'),
    bio: t('landing.previewBio'), avatarUrl: null, imageCrop: null,
    templateKey: 'soft-mint', themeConfig: null, primaryCtaLabel: t('landing.previewCta'), primaryCtaUrl: '#demo-contact',
    secondaryCtaLabel: null, secondaryCtaUrl: null, email: null, phone: null, address: null,
    links: [{ linkId: 1, platform: 'website', label: t('landing.previewLink'), url: '#demo-link', sortOrder: 0, isVisible: true }],
    seoTitle: t('landing.previewName'), seoDescription: t('landing.previewBio'), publishedAt: null,
  };
  return <Box component="main" minHeight="100svh" sx={{ bgcolor: '#0B100E', py: 3, px: 2 }}>
    <Stack direction="row" justifyContent="space-between" maxWidth={680} mx="auto" mb={2}>
      <Button component={RouterLink} to="/" startIcon={<ArrowBackRounded />} sx={{ color: 'white' }}>{t('landing.back')}</Button>
      <Button component={RouterLink} to="/register?returnTo=%2Fcustomer-profile%2Fnew" variant="contained">{t('landing.create')}</Button>
    </Stack>
    <Box maxWidth={680} mx="auto">
      <Alert severity="info" sx={{ mb: 2 }}>{t('landing.demoSafeNotice')}</Alert>
      <ProfileLandingCard profile={demo} interactionMode="demo" onDemoAction={(event, target) => { if (event === 'cta_click') setContactOpen(true); else if (target) setContactOpen(true); }} />
      <Collapse in={contactOpen}><Box id="demo-contact" sx={{ mt: 2, p: 2.5, borderRadius: 4, bgcolor: 'background.paper' }}>
        <Typography variant="h6" fontWeight={800}>{t('profile.lead.title')}</Typography>
        {sent ? <Alert severity="success" sx={{ mt: 2 }}>{t('landing.demoSubmitted')}</Alert> : <Stack component="form" spacing={1.5} mt={2} onSubmit={(event) => { event.preventDefault(); setSent(true); }}><TextField required label={t('profile.lead.name')} /><TextField required type="email" label={t('common.email')} /><TextField multiline minRows={2} label={t('profile.lead.message')} /><Button type="submit" variant="contained">{t('profile.lead.submit')}</Button></Stack>}
      </Box></Collapse>
    </Box>
  </Box>;
}
