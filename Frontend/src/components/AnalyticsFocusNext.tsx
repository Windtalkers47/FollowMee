import ArrowForward from '@mui/icons-material/ArrowForward';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import TrendingUp from '@mui/icons-material/TrendingUp';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type { MessageKey } from '../i18n/messages';

type MetricGroup = Record<string, number | string | null>;
type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
export type AnalyticsFocusKind = 'blocked' | 'customers' | 'profiles' | 'momentum';
export interface AnalyticsFocusMetrics { work: MetricGroup; customers: MetricGroup; profiles: MetricGroup }
const numberValue = (value: unknown) => Number(value || 0);

// eslint-disable-next-line react-refresh/only-export-components
export function resolveAnalyticsFocusKind(metrics: AnalyticsFocusMetrics): AnalyticsFocusKind {
  if (numberValue(metrics.work.blocked) > 0) return 'blocked';
  const total = numberValue(metrics.customers.portfolioTotal ?? metrics.customers.total);
  const ready = numberValue(metrics.customers.profilesReady);
  if (numberValue(metrics.customers.missingImage) > 0 || (total > 0 && ready < total)) return 'customers';
  if (numberValue(metrics.profiles.views) > 0 && numberValue(metrics.profiles.clicks) === 0) return 'profiles';
  return 'momentum';
}

export default function AnalyticsFocusNext({ metrics, t, onAction }: { metrics: AnalyticsFocusMetrics; t: Translator; onAction: (path: string) => void }) {
  const kind = resolveAnalyticsFocusKind(metrics);
  const config = {
    blocked: { icon: <BlockOutlined />, title: t('analytics.focus.blockedTitle'), description: t('analytics.focus.blockedDescription', { count: numberValue(metrics.work.blocked) }), action: t('analytics.action.openWork'), path: '/my-work' },
    customers: { icon: <GroupsOutlined />, title: t('analytics.focus.customersTitle'), description: t('analytics.focus.customersDescription', { count: numberValue(metrics.customers.missingImage) || numberValue(metrics.customers.portfolioTotal) - numberValue(metrics.customers.profilesReady) }), action: t('analytics.action.openCustomers'), path: '/customer' },
    profiles: { icon: <InsightsOutlined />, title: t('analytics.focus.profilesTitle'), description: t('analytics.focus.profilesDescription'), action: t('analytics.action.openProfiles'), path: '/customer-profile' },
    momentum: { icon: <TrendingUp />, title: t('analytics.focus.momentumTitle'), description: t('analytics.focus.momentumDescription'), action: t('analytics.action.openWork'), path: '/my-work' },
  }[kind];
  return <Card variant="outlined" sx={{ mb: 3, borderRadius: 3, boxShadow: 'none', bgcolor: 'action.hover' }}>
    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" flex={1}><ArrowForward color="primary" /><Typography variant="overline" fontWeight={850}>{t('analytics.focusNext')}</Typography><Typography fontWeight={800}>{config.title}</Typography></Stack>
        <Typography color="text.secondary" flex={2}>{config.description}</Typography>
        <Button variant="contained" endIcon={config.icon} onClick={() => onAction(config.path)} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>{config.action}</Button>
      </Stack>
    </CardContent>
  </Card>;
}
