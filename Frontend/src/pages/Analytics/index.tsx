import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, FormControl, IconButton, InputLabel, Menu, MenuItem,
  Select, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import { Download, MoreVert, TrendingDown, TrendingFlat, TrendingUp } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { differenceInCalendarDays, startOfMonth, subDays } from 'date-fns';
import { API_BASE_URL } from '../../api/config';
import { useAppSelector } from '../../store/store';
import NotificationAnalytics from '../NotificationAnalytics';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import AnalyticsPeriodToolbar from '../../components/AnalyticsPeriodToolbar';
import AnalyticsInsightSummary from '../../components/AnalyticsInsightSummary';
import AnalyticsAtAGlance from '../../components/AnalyticsAtAGlance';
import AnalyticsFocusNext from '../../components/AnalyticsFocusNext';
import { PageError, PageHeader, PageLoading, PageShell } from '../../components/PageState';

type MetricGroup = Record<string, number | string | null>;
type Overview = {
  range: { scope: string; startDate: string; endDate: string; rangeDays: number };
  work: MetricGroup;
  customers: MetricGroup;
  profiles: MetricGroup;
  previous?: { work: MetricGroup; customers: MetricGroup; profiles: MetricGroup };
};

const tabNames = ['work', 'customers', 'profiles', 'notifications'] as const;
const metricOrder = {
  work: [['total', 'analytics.metric.total'], ['completed', 'analytics.metric.completed'], ['onTime', 'analytics.metric.onTime'], ['firstPass', 'analytics.metric.firstPass'], ['blocked', 'analytics.metric.blocked'], ['cycleHours', 'analytics.metric.cycleHours']],
  customers: [['added', 'analytics.metric.customersAdded'], ['portfolioTotal', 'analytics.metric.customersInPortfolio'], ['active', 'analytics.metric.active'], ['profilesReady', 'analytics.metric.profilesReady'], ['missingImage', 'analytics.metric.missingImage']],
  profiles: [['total', 'analytics.metric.profiles'], ['views', 'analytics.metric.views'], ['clicks', 'analytics.metric.clicks'], ['shares', 'analytics.metric.shares'], ['conversion', 'analytics.metric.conversion']],
} as const;

const toDateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromDateValue = (value: string | null, fallback: Date) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : fallback;
const numberValue = (value: unknown) => Number(value || 0);

export default function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = Math.max(0, tabNames.indexOf(params.get('tab') as typeof tabNames[number]));
  const [tab, setTab] = useState(initialTab);
  const [scope, setScope] = useState<'personal' | 'organization'>(params.get('scope') === 'organization' ? 'organization' : 'personal');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [range, setRange] = useState<[Date | null, Date | null]>(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [fromDateValue(params.get('startDate'), subDays(today, 29)), fromDateValue(params.get('endDate'), today)];
  });
  const startDate = range[0] ? toDateValue(range[0]) : '';
  const endDate = range[1] ? toDateValue(range[1]) : '';
  const user = useAppSelector(state => state.auth.user);
  const { t, locale } = useUserPreferences();
  const canOrganization = Boolean(user?.roles?.includes('Owner') || user?.permissions?.includes('VIEW_ORGANIZATION_ANALYTICS'));
  const rangeError = !range[0] || !range[1] ? t('calendar.completeRange') : range[0] > range[1] ? t('analytics.invalidDateOrder') : range[1] > new Date() ? t('analytics.futureDate') : differenceInCalendarDays(range[1], range[0]) + 1 > 366 ? t('calendar.rangeTooLong', { count: 366 }) : '';
  const query = useQuery({ queryKey: ['analytics', scope, startDate, endDate], queryFn: async () => (await axios.get(`${API_BASE_URL}/analytics/overview`, { params: { scope, startDate, endDate }, withCredentials: true })).data.data as Overview, enabled: tab !== 3 && !rangeError });
  const activeName = tabNames[tab];
  const metrics = activeName === 'work' ? query.data?.work : activeName === 'customers' ? query.data?.customers : query.data?.profiles;
  const previous = activeName === 'work' ? query.data?.previous?.work : activeName === 'customers' ? query.data?.previous?.customers : query.data?.previous?.profiles;
  const formatter = useMemo(() => new Intl.NumberFormat(locale === 'th' ? 'th-TH-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 }), [locale]);
  const presetValue = useMemo(() => {
    if (!range[0] || !range[1]) return 'custom';
    const days = differenceInCalendarDays(range[1], range[0]) + 1;
    if (toDateValue(range[0]) === toDateValue(startOfMonth(range[1]))) return 'month';
    return [7, 30, 90].includes(days) ? String(days) : 'custom';
  }, [range]);

  const applyRange = (next: [Date | null, Date | null]) => {
    setRange(next);
    if (!next[0] || !next[1]) return;
    setParams(current => { const updated = new URLSearchParams(current); updated.set('startDate', toDateValue(next[0]!)); updated.set('endDate', toDateValue(next[1]!)); updated.set('scope', scope); updated.set('tab', tabNames[tab]); return updated; }, { replace: true });
  };
  const applyPreset = (value: string) => {
    const end = new Date(); end.setHours(0, 0, 0, 0);
    applyRange([value === 'month' ? startOfMonth(end) : subDays(end, Number(value) - 1), end]);
    setRangeOpen(false);
  };
  const exportCsv = () => {
    if (!metrics) return;
    const csv = ['metric,value', ...Object.entries(metrics).map(([key, value]) => `${key},${value ?? 0}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = `followmee-${activeName}-${startDate}-${endDate}.csv`; link.click(); URL.revokeObjectURL(url); setMenuAnchor(null);
  };

  const insight = useMemo(() => {
    if (!metrics || activeName === 'notifications') return null;
    if (activeName === 'work') {
      const total = numberValue(metrics.total); const completed = numberValue(metrics.completed); const blocked = numberValue(metrics.blocked);
      return { value: total ? `${Math.round(completed / total * 100)}%` : '0%', title: t('analytics.insight.completion'), attention: blocked ? t('analytics.insight.blocked', { count: blocked }) : t('analytics.insight.noBlocked'), action: t('analytics.action.openWork'), path: blocked ? '/my-work?focus=blocked' : '/my-work' };
    }
    if (activeName === 'customers') {
      const missing = numberValue(metrics.missingImage); const ready = numberValue(metrics.profilesReady);
      const total = numberValue(metrics.portfolioTotal ?? metrics.total);
      return { value: total ? `${formatter.format(ready)} / ${formatter.format(total)}` : t('analytics.summary.noData'), title: t('analytics.insight.readyProfiles'), attention: missing ? t('analytics.insight.missingImages', { count: missing }) : t('analytics.insight.customersReady'), action: t('analytics.action.openCustomers'), path: missing ? '/customer?focus=missing-image' : '/customer' };
    }
    const conversion = numberValue(metrics.conversion);
    return { value: `${formatter.format(conversion)}%`, title: t('analytics.insight.conversion'), attention: numberValue(metrics.views) ? t('analytics.insight.profileActivity') : t('analytics.insight.noViews'), action: t('analytics.action.openProfiles'), path: '/customer-profile?focus=engagement' };
  }, [activeName, formatter, metrics, t]);

  return <PageShell maxWidth={1400}>
    <PageHeader title={t('nav.analytics')} subtitle={t('feature.analyticsSubtitle')} actions={<>
        <FormControl size="small" sx={{ minWidth: 170 }}><InputLabel>{t('feature.scope')}</InputLabel><Select label={t('feature.scope')} value={scope} onChange={event => { const next = event.target.value as typeof scope; setScope(next); setParams(current => { const updated = new URLSearchParams(current); updated.set('scope', next); return updated; }); }}><MenuItem value="personal">{t('feature.myAnalytics')}</MenuItem>{canOrganization && <MenuItem value="organization">{t('feature.organization')}</MenuItem>}</Select></FormControl>
        {tab !== 3 && <><IconButton aria-label={t('common.more')} onClick={event => setMenuAnchor(event.currentTarget)}><MoreVert /></IconButton><Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}><MenuItem disabled={!metrics || Boolean(rangeError)} onClick={exportCsv}><Download fontSize="small" sx={{ mr: 1 }} />{t('feature.exportCsv')}</MenuItem></Menu></>}
      </>} />

    <AnalyticsPeriodToolbar startDate={startDate} endDate={endDate} presetValue={presetValue} rangeOpen={rangeOpen} range={range} rangeError={rangeError} t={t} onToggleRange={() => setRangeOpen(value => !value)} onPresetChange={applyPreset} onRangeChange={applyRange} />

    {tab === 0 && query.data && !query.isLoading && !query.isError && !rangeError && <>
      <AnalyticsAtAGlance metrics={{ work: query.data.work, customers: query.data.customers, profiles: query.data.profiles }} previous={query.data.previous} formatter={formatter} t={t} />
      <AnalyticsFocusNext metrics={{ work: query.data.work, customers: query.data.customers, profiles: query.data.profiles }} t={t} onAction={path => navigate(path)} />
    </>}

    <Tabs value={tab} onChange={(_, value) => { setTab(value); setParams(current => { const updated = new URLSearchParams(current); updated.set('tab', tabNames[value]); return updated; }); }} variant="scrollable" sx={{ mb: 2 }}><Tab label={t('feature.work')} /><Tab label={t('feature.customers')} /><Tab label={t('feature.profileCards')} /><Tab label={t('feature.notifications')} /></Tabs>

    {tab === 3 ? <NotificationAnalytics startDate={startDate} endDate={endDate} /> : rangeError ? <Alert severity="warning">{rangeError}</Alert> : query.isError ? <PageError title={t('feature.analyticsLoadError')} message={t('feedback.networkHelp')} retryLabel={t('feedback.retry')} onRetry={() => void query.refetch()} /> : query.isLoading ? <PageLoading rows={2} label={t('feedback.loadingPage')} /> : <>
      {activeName === 'work' && metrics && <AnalyticsInsightSummary metrics={metrics} previous={previous} formatter={formatter} t={t} onAction={() => navigate('/my-work')} />}
      {activeName !== 'work' && insight && <Card variant="outlined" sx={{ mb: 3, borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={2}><Box><Typography variant="h3" fontWeight={850}>{insight.value}</Typography><Typography fontWeight={800}>{insight.title}</Typography></Box><Typography color="text.secondary" flex={1}>{insight.attention}</Typography><Button variant="contained" onClick={() => navigate(insight.path)}>{insight.action}</Button></Stack></CardContent></Card>}
      <Box display="grid" gridTemplateColumns="repeat(auto-fit,minmax(190px,1fr))" gap={2}>{metricOrder[activeName as 'work' | 'customers' | 'profiles'].map(([key, labelKey]) => { const value = numberValue(metrics?.[key]); const before = numberValue(previous?.[key]); const delta = value - before; const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : TrendingFlat; const trend = before === 0 && value > 0 ? t('analytics.trend.new') : value === before ? t('analytics.trend.noChange') : value > before ? t('analytics.trend.upFrom', { value: formatter.format(before) }) : t('analytics.trend.downFrom', { value: formatter.format(before) }); return <Card key={key} variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}><CardContent><Typography color="text.secondary">{t(labelKey)}</Typography><Typography variant="h4" fontWeight={800}>{formatter.format(value)}{key === 'conversion' ? '%' : ''}</Typography><Stack direction="row" alignItems="center" gap={0.5} mt={1}><TrendIcon fontSize="small" color={delta === 0 ? 'disabled' : 'primary'} /><Typography variant="caption" color="text.secondary">{trend}</Typography></Stack></CardContent></Card>; })}</Box>
    </>}
  </PageShell>;
}
