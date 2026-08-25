import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { apiConfig } from '../../api/config';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
export default function VerifyPrivacyRequestPage() { const { t } = useUserPreferences(); const [params] = useSearchParams(); const [state, setState] = useState<'loading'|'success'|'error'>('loading'); useEffect(() => { fetch(`${apiConfig.baseURL}/privacy/requests/verify?token=${encodeURIComponent(params.get('token') || '')}`).then(r => { if (!r.ok) throw new Error(); setState('success'); }).catch(() => setState('error')); }, [params]); return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>{state === 'loading' ? <CircularProgress /> : <Alert severity={state === 'success' ? 'success' : 'error'}>{t(state === 'success' ? 'uat.verify.privacySuccess' : 'uat.verify.invalid')}</Alert>}</Box>; }
