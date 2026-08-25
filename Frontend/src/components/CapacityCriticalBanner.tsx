import { useEffect, useState } from 'react';
import { Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/store';
import { API_URL } from '../utils/runtimeEnv';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
export default function CapacityCriticalBanner() {
  const { t } = useUserPreferences();
  const roles = useAppSelector(state => state.auth.user?.roles || []); const navigate = useNavigate(); const [critical, setCritical] = useState(false);
  useEffect(() => { if (!roles.some(role => ['Owner','Admin','Moderator'].includes(role))) return; const load = () => fetch(`${API_URL}/system/capacity`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(payload => setCritical(Boolean(payload?.data?.providers?.some((provider: { metrics: Array<{ exact: boolean; percent: number | null }> }) => provider.metrics.some(metric => metric.exact && (metric.percent || 0) >= 95))))).catch(() => undefined); void load(); const timer = setInterval(load, 300000); return () => clearInterval(timer); }, [roles]);
  return critical ? <Alert severity="error" action={<Button color="inherit" onClick={() => navigate('/system-capacity')}>{t('common.open')}</Button>} sx={{ position: 'fixed', zIndex: 1500, top: 72, left: '50%', transform: 'translateX(-50%)', width: 'min(720px, calc(100% - 24px))', boxShadow: 6 }}>{t('uat.capacity.critical')}</Alert> : null;
}
