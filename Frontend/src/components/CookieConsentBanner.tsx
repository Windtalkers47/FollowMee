import { useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { apiConfig } from '../api/config';
import { CONSENT_VERSION, consentAnonymousId, readConsent, saveConsent } from '../utils/consentPreferences';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

export default function CookieConsentBanner() {
  const { t } = useUserPreferences();
  const [visible, setVisible] = useState(() => !readConsent());
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  if (!visible) return null;
  const persist = (allowAll = false) => {
    const value = { version: CONSENT_VERSION, essential: true as const, preferences: allowAll || preferences, analytics: allowAll || analytics, decidedAt: new Date().toISOString() };
    saveConsent(value); setVisible(false);
    void fetch(`${apiConfig.baseURL}/privacy/consents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anonymousId: consentAnonymousId(), policyVersion: CONSENT_VERSION, preferences: value.preferences, analytics: value.analytics }) }).catch(() => undefined);
  };
  return <Alert severity="info" role="dialog" aria-label={t('privacy.cookies.title')} sx={{ position: 'fixed', zIndex: 1600, left: { xs: 12, sm: 24 }, right: { xs: 12, sm: 'auto' }, bottom: 16, maxWidth: 560, boxShadow: 8, alignItems: 'flex-start' }}>
    <Typography fontWeight={800}>{t('privacy.cookies.title')}</Typography>
    <Typography variant="body2" sx={{ mt: .5 }}>{t('privacy.cookies.description')}</Typography>
    <Box sx={{ mt: 1 }}><FormControlLabel control={<Checkbox checked disabled />} label={t('privacy.cookies.essential')} /><FormControlLabel control={<Checkbox checked={preferences} onChange={(_, value) => setPreferences(value)} />} label={t('privacy.cookies.preferences')} /><FormControlLabel control={<Checkbox checked={analytics} onChange={(_, value) => setAnalytics(value)} />} label={t('privacy.cookies.analytics')} /></Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mt={1}><Button variant="contained" onClick={() => persist(true)}>{t('privacy.cookies.allowAll')}</Button><Button variant="outlined" onClick={() => persist(false)}>{t('privacy.cookies.save')}</Button></Stack>
  </Alert>;
}
