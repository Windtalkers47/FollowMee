import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import PlayCircleOutlineRounded from '@mui/icons-material/PlayCircleOutlineRounded';
import { useAppSelector } from '../../store/store';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

export default function LandingPage() {
  const authenticated = useAppSelector(state => state.auth.isAuthenticated);
  const { t } = useUserPreferences();
  const createPath = authenticated ? '/customer-profile/new' : '/register?returnTo=%2Fcustomer-profile%2Fnew';
  return <Box component="main" minHeight="100svh" sx={{ bgcolor: 'background.default', py: { xs: 4, md: 10 } }}>
    <Container maxWidth="lg">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 5, md: 9 }} alignItems="center">
        <Box flex={1}>
          <Typography variant="overline" color="primary.main" fontWeight={900}>{t('landing.eyebrow')}</Typography>
          <Typography component="h1" variant="h2" fontWeight={900} sx={{ mt: 1, maxWidth: 720 }}>{t('landing.title')}</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ my: 3, maxWidth: 660 }}>{t('landing.subtitle')}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to={createPath} variant="contained" size="large" endIcon={<ArrowForwardRounded />}>{t('landing.create')}</Button>
            <Button component={RouterLink} to="/demo/profile" variant="outlined" size="large" startIcon={<PlayCircleOutlineRounded />}>{t('landing.demo')}</Button>
            {!authenticated && <Button component={RouterLink} to="/login" size="large">{t('auth.login.signIn')}</Button>}
          </Stack>
        </Box>
        <Paper variant="outlined" sx={{ width: { xs: '100%', md: 400 }, p: 3, borderRadius: 6, background: 'linear-gradient(150deg,#E6F8EC,#F9F5EC 60%,#EEF1FF)' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'white', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 26 }}>{t('landing.brandMark')}</Box>
          <Typography variant="h4" fontWeight={900} sx={{ mt: 3 }}>{t('landing.cardTitle')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>{t('landing.cardBody')}</Typography>
          <Button component={RouterLink} to="/demo/profile" fullWidth variant="contained" sx={{ mt: 3 }}>{t('landing.viewDemo')}</Button>
        </Paper>
      </Stack>
    </Container>
  </Box>;
}
