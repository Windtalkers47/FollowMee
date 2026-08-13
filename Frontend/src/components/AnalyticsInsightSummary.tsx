import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import TrendingDown from '@mui/icons-material/TrendingDown';
import TrendingFlat from '@mui/icons-material/TrendingFlat';
import TrendingUp from '@mui/icons-material/TrendingUp';
import WarningAmber from '@mui/icons-material/WarningAmber';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type { MessageKey } from '../i18n/messages';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
type MetricGroup = Record<string, number | string | null>;

export interface AnalyticsInsightSummaryProps {
  metrics: MetricGroup;
  previous?: MetricGroup;
  formatter: Intl.NumberFormat;
  t: Translator;
  onAction: () => void;
}

const numberValue = (value: unknown) => Number(value || 0);

export default function AnalyticsInsightSummary({ metrics, previous, formatter, t, onAction }: AnalyticsInsightSummaryProps) {
  const total = numberValue(metrics.total);
  const completed = numberValue(metrics.completed);
  const blocked = numberValue(metrics.blocked);
  const onTime = numberValue(metrics.onTime);
  const firstPass = numberValue(metrics.firstPass);
  const completion = total ? Math.round((completed / total) * 100) : 0;
  const previousTotal = numberValue(previous?.total);
  const previousCompleted = numberValue(previous?.completed);
  const previousCompletion = previousTotal ? Math.round((previousCompleted / previousTotal) * 100) : 0;
  const delta = completion - previousCompletion;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : TrendingFlat;
  const trendColor = delta > 0 ? 'success' : delta < 0 ? 'error' : 'default';
  const hasWork = total > 0;

  return (
    <Card variant="outlined" sx={{ mb: 3, borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems={{ md: 'center' }}>
          <Box sx={{ minWidth: { md: 190 } }}>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>{t('analytics.workHealth')}</Typography>
            {hasWork ? <><Typography variant="h3" fontWeight={850} lineHeight={1}>{completion}%</Typography><Typography fontWeight={700}>{t('analytics.completion')}</Typography></> : <Typography fontWeight={700}>{t('analytics.noWork')}</Typography>}
          </Box>
          {hasWork ? <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
              <Chip icon={<TrendIcon />} color={trendColor} variant="outlined" label={t('analytics.vsPreviousPoints', { value: `${delta > 0 ? '+' : ''}${delta}` })} />
              <Chip icon={blocked ? <WarningAmber /> : <CheckCircleOutline />} color={blocked ? 'warning' : 'success'} variant="outlined" label={blocked ? t('analytics.insight.blocked', { count: blocked }) : t('analytics.insight.noBlocked')} />
              <Chip variant="outlined" label={t('analytics.workSignals', { onTime: formatter.format(onTime), firstPass: formatter.format(firstPass) })} />
            </Stack>
            <Button variant="contained" onClick={onAction} sx={{ minHeight: 42, alignSelf: { xs: 'stretch', md: 'center' } }}>{t('analytics.action.openWork')}</Button>
          </> : <Button variant="contained" onClick={onAction} sx={{ minHeight: 42, alignSelf: { xs: 'stretch', md: 'center' } }}>{t('analytics.action.openWork')}</Button>}
        </Stack>
      </CardContent>
    </Card>
  );
}
