import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { API_URL } from '../../utils/runtimeEnv';
import { PageHeader, PageLoading, PageShell } from '../../components/PageState';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import type { MessageKey } from '../../i18n/messages';

type Metric = { resource: string; used: number | null; limit: number | null; remaining: number | null; unit: string; percent: number | null; resetAt: string | null; lastUpdatedAt: string; exact: boolean; source: 'runtime'|'database'|'provider-api'|'provider-dashboard'|'unavailable'; errorCode?: string };
type Provider = { provider: string; status: 'healthy'|'warning'|'critical'|'unknown'; dashboardUrl?: string; metrics: Metric[]; note?: string };
const statusKey = (status: Provider['status']) => `uat.capacity.status.${status}` as MessageKey;
const resourceKey = (resource: string) => `uat.capacity.resource.${resource}` as MessageKey;
const formatMetricValue = (value: number | null, unit: string) => value == null ? '—' : `${value.toLocaleString()} ${unit}`;
const metricSourceKey = (metric: Metric): MessageKey => metric.exact ? 'uat.capacity.verified' : metric.source === 'unavailable' ? 'uat.capacity.unavailable' : 'uat.capacity.provider';

export default function SystemCapacityPage() {
  const { t } = useUserPreferences();
  const [data, setData] = useState<{ checkedAt: string; providers: Provider[] } | null>(null);
  const [error, setError] = useState(false);
  const load = () => fetch(`${API_URL}/system/capacity`, { credentials: 'include' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(p => { setData(p.data); setError(false); }).catch(() => setError(true));
  useEffect(() => { void load(); const timer = setInterval(load, 300_000); return () => clearInterval(timer); }, []);
  return <PageShell>
    <PageHeader title={t('uat.capacity.title')} subtitle={t('uat.capacity.subtitle')} />
    <Alert severity="info">{t('uat.capacity.turnstileNote')}</Alert>
    {error && <Alert severity="error">{t('uat.capacity.error')}</Alert>}
    {!data ? <PageLoading rows={3} label={t('uat.capacity.loading')} /> : <Stack gap={2}>
      {data.providers.map(provider => <Card variant="outlined" key={provider.provider} sx={{ borderRadius: 3 }}><CardContent>
        <Stack direction="row" justifyContent="space-between"><Typography variant="h6" textTransform="capitalize">{provider.provider}</Typography><Chip label={t(statusKey(provider.status))} color={provider.status === 'critical' ? 'error' : provider.status === 'warning' ? 'warning' : provider.status === 'healthy' ? 'success' : 'default'} /></Stack>
        {provider.metrics.map(metric => <Stack key={metric.resource} gap={.5} mt={2}>
          <Stack direction="row" justifyContent="space-between"><Typography>{t(resourceKey(metric.resource))}</Typography><Typography>{metric.percent == null ? t('uat.capacity.providerOnly') : `${metric.percent.toFixed(1)}%`}</Typography></Stack>
          {metric.percent != null && <LinearProgress variant="determinate" value={Math.min(metric.percent, 100)} color={metric.percent >= 95 ? 'error' : metric.percent >= 70 ? 'warning' : 'primary'} />}
          <Typography variant="body2">{formatMetricValue(metric.used, metric.unit)} / {formatMetricValue(metric.limit, metric.unit)}</Typography>
          <Typography variant="caption" color="text.secondary">{metric.remaining == null ? t('uat.capacity.remainingUnknown') : `${t('uat.capacity.remaining')}: ${formatMetricValue(metric.remaining, metric.unit)}`} · {t(metricSourceKey(metric))}</Typography>
          {metric.resetAt && <Typography variant="caption" color="text.secondary">{t('uat.capacity.resetAt')}: {new Date(metric.resetAt).toLocaleString()}</Typography>}
          <Typography variant="caption" color="text.secondary">{t('uat.capacity.lastUpdated')}: {new Date(metric.lastUpdatedAt).toLocaleString()}</Typography>
          {metric.source === 'unavailable' && <Alert severity="warning" sx={{ mt: 1 }}>{t('uat.capacity.unavailable')}</Alert>}
        </Stack>)}
        {provider.note && <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{provider.note}</Typography>}
        {provider.metrics.some(metric => metric.source === 'provider-dashboard') && <Alert severity="info" sx={{ mt: 2 }}>{t('uat.capacity.providerOnly')}</Alert>}
        {provider.dashboardUrl && <Button href={provider.dashboardUrl} target="_blank" rel="noreferrer" sx={{ mt: 1 }}>{t('uat.capacity.openDashboard')}</Button>}
      </CardContent></Card>)}
    </Stack>}
  </PageShell>;
}
