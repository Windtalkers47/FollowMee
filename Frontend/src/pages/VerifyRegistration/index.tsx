import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import authApi from '../../api/auth.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
type VerifyState = 'loading' | 'bootstrap' | 'pending' | 'setup-required' | 'recovery' | 'error';

export default function VerifyRegistrationPage() {
  const { t } = useUserPreferences();
  const [params] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const verify = () => {
    setState('loading');
    const token = params.get('token') || '';
    authApi.verifyRegistration(token).then(response => {
      if (response.data?.bootstrapCompleted) setState('bootstrap');
      else if (response.data?.ownerSetupRequired) setState('setup-required');
      else setState('pending');
    }).catch((error: unknown) => {
      setState(error instanceof Error && 'code' in error && error.code === 'OWNER_RECOVERY_REQUIRED' ? 'recovery' : 'error');
    });
  };
  useEffect(() => { verify(); }, [params]);
  const messageKey = state === 'bootstrap' ? 'uat.verify.ownerReady'
    : state === 'pending' ? 'uat.verify.registrationSuccess'
      : state === 'setup-required' ? 'uat.verify.ownerSetupRequired'
        : state === 'recovery' ? 'uat.verify.ownerRecoveryRequired'
          : 'uat.verify.invalid';
  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}><Paper variant="outlined" sx={{ p: 4, maxWidth: 520, borderRadius: 4 }}><Stack gap={2} alignItems="flex-start">{state === 'loading' ? <CircularProgress /> : <Alert severity={state === 'bootstrap' || state === 'pending' ? 'success' : state === 'setup-required' ? 'info' : 'error'}>{t(messageKey)}</Alert>}<Typography variant="h4" fontWeight={900}>{t('uat.verify.registrationTitle')}</Typography>{state === 'error' && <Button onClick={verify}>{t('feedback.retry')}</Button>}<Button component={RouterLink} to="/login" variant="contained">{t('uat.verify.login')}</Button></Stack></Paper></Box>;
}
