import { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../api/config';
import { useAppSelector } from '../../store/store';
import NotificationAnalytics from '../NotificationAnalytics';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { RangeCalendar } from '../../components/RangeCalendar';
import { differenceInCalendarDays, startOfMonth, subDays } from 'date-fns';

type Overview = { range: { scope: string }; work: Record<string, number>; customers: Record<string, number>; profiles: Record<string, number> };
const tabNames = ['work', 'customers', 'profiles', 'notifications'] as const;
const toDateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromDateValue = (value: string | null, fallback: Date) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : fallback;

export default function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const initialTab = Math.max(0, tabNames.indexOf(params.get('tab') as typeof tabNames[number]));
  const [tab, setTab] = useState(initialTab);
  const [scope, setScope] = useState<'personal' | 'organization'>(params.get('scope') === 'organization' ? 'organization' : 'personal');
  const [range, setRange] = useState<[Date | null, Date | null]>(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [fromDateValue(params.get('startDate'), subDays(today, 29)), fromDateValue(params.get('endDate'), today)];
  });
  const startDate = range[0] ? toDateValue(range[0]) : '';
  const endDate = range[1] ? toDateValue(range[1]) : '';
  const user = useAppSelector(state => state.auth.user);
  const { t } = useUserPreferences();
  const canOrganization = Boolean(user?.roles?.includes('Owner') || user?.permissions?.includes('VIEW_ORGANIZATION_ANALYTICS'));
  const rangeError = !range[0] || !range[1] ? t('calendar.completeRange') : range[0] > range[1] ? t('analytics.invalidDateOrder') : range[1] > new Date() ? t('analytics.futureDate') : differenceInCalendarDays(range[1], range[0]) + 1 > 366 ? t('calendar.rangeTooLong', { count: 366 }) : '';
  const query = useQuery({ queryKey: ['analytics', scope, startDate, endDate], queryFn: async () => (await axios.get(`${API_BASE_URL}/analytics/overview`, { params: { scope, startDate, endDate }, withCredentials: true })).data.data as Overview, enabled: tab !== 3 && !rangeError });
  const metrics = useMemo(() => tab === 0 ? query.data?.work : tab === 1 ? query.data?.customers : query.data?.profiles, [query.data, tab]);
  const exportCsv = () => {
    if (!metrics) return;
    const csv = ['metric,value', ...Object.entries(metrics).map(([key, value]) => `${key},${value ?? 0}`)].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `followmee-${tabNames[tab]}-${startDate}-${endDate}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  const applyRange = (next: [Date | null, Date | null]) => {
    setRange(next);
    if (!next[0] || !next[1]) return;
    setParams(current => {
      const updated = new URLSearchParams(current);
      updated.set('startDate', toDateValue(next[0]!));
      updated.set('endDate', toDateValue(next[1]!));
      updated.set('scope', scope);
      updated.set('tab', tabNames[tab]);
      return updated;
    }, { replace: true });
  };
  const preset = (days: number | 'month') => {
    const end = new Date(); end.setHours(0, 0, 0, 0);
    applyRange([days === 'month' ? startOfMonth(end) : subDays(end, days - 1), end]);
  };
  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
    <Typography variant="h3" fontWeight={800}>{t('nav.analytics')}</Typography><Typography color="text.secondary" mb={3}>{t('feature.analyticsSubtitle')}</Typography>
    <Tabs value={tab} onChange={(_, value) => { setTab(value); setParams(current => { const updated = new URLSearchParams(current); updated.set('tab', tabNames[value]); return updated; }); }} variant="scrollable"><Tab label={t('feature.work')} /><Tab label={t('feature.customers')} /><Tab label={t('feature.profileCards')} /><Tab label={t('feature.notifications')} /></Tabs>
    <Stack direction={{ xs: 'column', md: 'row' }} gap={2} my={3} alignItems={{ md: 'center' }}>
      <FormControl sx={{ minWidth: 180 }}><InputLabel>{t('feature.scope')}</InputLabel><Select label={t('feature.scope')} value={scope} onChange={event => { const next = event.target.value as typeof scope; setScope(next); setParams(current => { const updated = new URLSearchParams(current); updated.set('scope', next); return updated; }); }}><MenuItem value="personal">{t('feature.myAnalytics')}</MenuItem>{canOrganization && <MenuItem value="organization">{t('feature.organization')}</MenuItem>}</Select></FormControl>
      <Box sx={{ minWidth: { md: 330 }, flex: { md: 1 }, maxWidth: 480 }}><RangeCalendar value={range} onChange={applyRange} allowPast maxDate={new Date()} maxRangeDays={366} label={t('task.form.dateRange')} error={Boolean(rangeError)} helperText={rangeError} /></Box>
      <Stack direction="row" gap={.5} flexWrap="wrap"><Button size="small" onClick={() => preset(7)}>7</Button><Button size="small" onClick={() => preset(30)}>30</Button><Button size="small" onClick={() => preset(90)}>90</Button><Button size="small" onClick={() => preset('month')}>{t('analytics.thisMonth')}</Button></Stack>
      {tab !== 3 && <Button variant="outlined" disabled={Boolean(rangeError) || !metrics} onClick={exportCsv}>{t('feature.exportCsv')}</Button>}
    </Stack>
    {tab === 3 ? <NotificationAnalytics startDate={startDate} endDate={endDate} /> : <>
      {rangeError ? <Alert severity="warning">{rangeError}</Alert> : query.isError ? <Alert severity="error" action={<Button onClick={() => query.refetch()}>{t('feedback.retry')}</Button>}>{t('feature.analyticsLoadError')}</Alert> : <Box display="grid" gridTemplateColumns="repeat(auto-fit,minmax(190px,1fr))" gap={2}>{Object.entries(metrics || {}).map(([key, value]) => <Card key={key} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Typography color="text.secondary" textTransform="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Typography><Typography variant="h4" fontWeight={800}>{value ?? 0}</Typography></CardContent></Card>)}</Box>}
    </>}
  </Box>;
}
