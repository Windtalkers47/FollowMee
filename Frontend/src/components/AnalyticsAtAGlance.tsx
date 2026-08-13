import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import type { MessageKey } from '../i18n/messages';

type MetricGroup = Record<string, number | string | null>;
type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export interface AnalyticsAtAGlanceProps {
  metrics: { work: MetricGroup; customers: MetricGroup; profiles: MetricGroup };
  previous?: { work: MetricGroup; customers: MetricGroup; profiles: MetricGroup };
  formatter: Intl.NumberFormat;
  t: Translator;
}

const numberValue = (value: unknown) => Number(value || 0);
const trendText = (current: number, before: number, formatter: Intl.NumberFormat, t: Translator) => {
  if (before === 0 && current > 0) return t('analytics.trend.new');
  if (current === before) return t('analytics.trend.noChange');
  return current > before
    ? t('analytics.trend.upFrom', { value: formatter.format(before) })
    : t('analytics.trend.downFrom', { value: formatter.format(before) });
};

function Signal({ icon, title, value, helper, trend, progress, empty }: { icon: React.ReactNode; title: string; value: string; helper: string; trend: string; progress?: number; empty?: boolean }) {
  return <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none', minWidth: 0 }}>
    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
      <Stack direction="row" spacing={1.25} alignItems="center" mb={1.25}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
        <Typography fontWeight={800}>{title}</Typography>
      </Stack>
      <Typography variant="h4" fontWeight={850} lineHeight={1.1}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.75}>{helper}</Typography>
      {progress !== undefined && <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, progress))} sx={{ mt: 1.5, height: 6, borderRadius: 3 }} />}
      <Typography variant="caption" color={empty ? 'text.secondary' : 'text.secondary'} display="block" mt={1.25}>{trend}</Typography>
    </CardContent>
  </Card>;
}

export default function AnalyticsAtAGlance({ metrics, previous, formatter, t }: AnalyticsAtAGlanceProps) {
  const total = numberValue(metrics.work.total);
  const completed = numberValue(metrics.work.completed);
  const previousWorkTotal = numberValue(previous?.work.total);
  const previousCompleted = numberValue(previous?.work.completed);
  const completion = total ? Math.round(completed / total * 100) : 0;
  const previousCompletion = previousWorkTotal ? Math.round(previousCompleted / previousWorkTotal * 100) : 0;
  const portfolioTotal = numberValue(metrics.customers.portfolioTotal ?? metrics.customers.total);
  const ready = numberValue(metrics.customers.profilesReady);
  const previousReady = numberValue(previous?.customers.profilesReady);
  const views = numberValue(metrics.profiles.views);
  const clicks = numberValue(metrics.profiles.clicks);
  const conversion = numberValue(metrics.profiles.conversion);
  const previousViews = numberValue(previous?.profiles.views);
  const conversionText = views ? `${formatter.format(conversion)}%` : t('analytics.summary.noData');

  return <Box component="section" aria-labelledby="analytics-at-a-glance" mb={3}>
    <Typography id="analytics-at-a-glance" variant="h5" fontWeight={850}>{t('analytics.atAGlance')}</Typography>
    <Typography color="text.secondary" mb={1.75}>{t('analytics.atAGlanceHelp')}</Typography>
    <Box display="grid" gridTemplateColumns="repeat(auto-fit,minmax(220px,1fr))" gap={1.5}>
      <Signal icon={<TaskAltOutlined />} title={t('analytics.summary.workProgress')} value={total ? `${completion}%` : t('analytics.summary.noData')} helper={t('analytics.summary.workProgressHelp', { completed: formatter.format(completed), total: formatter.format(total) })} trend={trendText(completion, previousCompletion, formatter, t)} progress={total ? completion : undefined} empty={!total} />
      <Signal icon={<PeopleAltOutlined />} title={t('analytics.summary.customerReadiness')} value={portfolioTotal ? `${Math.round(ready / portfolioTotal * 100)}%` : t('analytics.summary.noData')} helper={t('analytics.summary.customerReadinessHelp', { ready: formatter.format(ready), total: formatter.format(portfolioTotal) })} trend={trendText(ready, previousReady, formatter, t)} progress={portfolioTotal ? ready / portfolioTotal * 100 : undefined} empty={!portfolioTotal} />
      <Signal icon={<InsightsOutlined />} title={t('analytics.summary.profileReach')} value={conversionText} helper={t('analytics.summary.profileReachHelp', { views: formatter.format(views), clicks: formatter.format(clicks) })} trend={trendText(views, previousViews, formatter, t)} empty={!views} />
    </Box>
  </Box>;
}

// eslint-disable-next-line react-refresh/only-export-components
export { trendText };
