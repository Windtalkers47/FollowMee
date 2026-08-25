import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
export default function LegalPage() {
  const privacy = useLocation().pathname === '/privacy';
  const { t } = useUserPreferences();
  const controller = { name: import.meta.env.VITE_PRIVACY_CONTROLLER_NAME || 'ยังไม่ได้กำหนด', email: import.meta.env.VITE_PRIVACY_CONTROLLER_EMAIL || 'ยังไม่ได้กำหนด', address: import.meta.env.VITE_PRIVACY_CONTROLLER_ADDRESS || 'ยังไม่ได้กำหนด', effectiveDate: import.meta.env.VITE_PRIVACY_POLICY_EFFECTIVE_DATE || 'ยังไม่ได้กำหนด' };
  return <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 6 } }}><Paper variant="outlined" sx={{ maxWidth: 820, mx: 'auto', p: { xs: 3, md: 5 }, borderRadius: 4 }}>
    <Stack gap={2}><Typography variant="overline">{t('uat.legal.version')}</Typography><Typography variant="h3" fontWeight={900}>{t(privacy ? 'uat.legal.privacyTitle' : 'uat.legal.termsTitle')}</Typography><Divider />
      {privacy ? <><Typography>{t('uat.legal.collection')}</Typography><Typography>{t('uat.legal.storage')}</Typography><Typography>{t('uat.legal.rights')}</Typography><Typography><b>{t('uat.legal.controller')}:</b> {controller.name}<br /><b>{t('uat.legal.contact')}:</b> {controller.email}<br /><b>{t('uat.legal.address')}:</b> {controller.address}<br /><b>{t('uat.legal.effective')}:</b> {controller.effectiveDate}</Typography><Typography color="warning.main">{t('uat.legal.draft')}</Typography></> : <><Typography>{t('uat.legal.termsUse')}</Typography><Typography>{t('uat.legal.termsAccess')}</Typography><Typography>{t('uat.legal.termsSla')}</Typography></>}
      <Stack direction="row" gap={1}><Button component={RouterLink} to="/privacy/request" variant="contained">{t('uat.legal.request')}</Button><Button component={RouterLink} to="/" variant="outlined">{t('uat.legal.home')}</Button></Stack>
    </Stack></Paper></Box>;
}
