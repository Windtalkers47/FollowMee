import CalendarMonth from '@mui/icons-material/CalendarMonth';
import { Box, Button, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { MessageKey } from '../i18n/messages';
import { RangeCalendar } from './RangeCalendar';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export interface AnalyticsPeriodToolbarProps {
  startDate: string;
  endDate: string;
  presetValue: string;
  rangeOpen: boolean;
  range: [Date | null, Date | null];
  rangeError: string;
  t: Translator;
  onToggleRange: () => void;
  onPresetChange: (value: string) => void;
  onRangeChange: (range: [Date | null, Date | null]) => void;
}

export default function AnalyticsPeriodToolbar({
  startDate, endDate, presetValue, rangeOpen, range, rangeError, t,
  onToggleRange, onPresetChange, onRangeChange,
}: AnalyticsPeriodToolbarProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Button
            variant="outlined"
            startIcon={<CalendarMonth />}
            onClick={onToggleRange}
            aria-expanded={rangeOpen}
            aria-label={`${t('analytics.period')}: ${startDate} – ${endDate}`}
            sx={{ minHeight: 42, justifyContent: 'flex-start', whiteSpace: 'nowrap', flex: { md: '0 1 auto' } }}
          >
            {startDate} – {endDate}
          </Button>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={presetValue}
            onChange={(_, value) => value && value !== 'custom' && onPresetChange(value)}
            aria-label={t('analytics.period')}
            sx={{
              width: { xs: '100%', md: 'auto' },
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': { minHeight: 40, flex: { xs: '1 1 25%', md: '0 0 auto' }, px: { xs: 1, sm: 1.5 } },
            }}
          >
            <ToggleButton value="7">{t('analytics.lastDays', { count: 7 })}</ToggleButton>
            <ToggleButton value="30">{t('analytics.lastDays', { count: 30 })}</ToggleButton>
            <ToggleButton value="90">{t('analytics.lastDays', { count: 90 })}</ToggleButton>
            <ToggleButton value="month">{t('analytics.thisMonth')}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {rangeOpen && (
          <Box mt={1.5} maxWidth={520}>
            <RangeCalendar value={range} onChange={onRangeChange} allowPast maxDate={new Date()} maxRangeDays={366} label={t('task.form.dateRange')} error={Boolean(rangeError)} helperText={rangeError} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
