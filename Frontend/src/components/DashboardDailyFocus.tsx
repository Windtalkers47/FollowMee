import { Alert, Box, Button, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import type { Task } from '../api/task.api';
import type { RewardSummary } from '../api/reward.api';
import type { MessageKey } from '../i18n/messages';
import type { Locale } from '../services/userPreferences.api';
import { formatLocalizedDate } from '../utils/localeFormat';
import { getDashboardPriorityKind } from '../utils/dashboardPriority';
import { translateRewardKey } from '../utils/rewardPresentation';
import AchievementArtwork from './AchievementArtwork';
import { LiquidGlassCard } from './LiquidGlassDashboard';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export default function DashboardDailyFocus({
  tasks, loading, error, latestAchievement, locale, isDarkMode, t, onRetry, onOpenTask, onOpenMyWork, onOpenAchievements,
}: {
  tasks: Task[];
  loading: boolean;
  error: boolean;
  latestAchievement?: RewardSummary['latestAchievement'];
  locale: Locale;
  isDarkMode: boolean;
  t: Translator;
  onRetry: () => void;
  onOpenTask: (taskId: string) => void;
  onOpenMyWork: () => void;
  onOpenAchievements: () => void;
}) {
  const priorityLabel = (task: Task) => ({
    overdue: t('dashboard.priority.overdue'), approval: t('dashboard.priority.approval'), dueToday: t('dashboard.priority.dueToday'), blocked: t('dashboard.priority.blocked'), dueSoon: t('dashboard.priority.dueSoon'),
  })[getDashboardPriorityKind(task)];

  return <Grid container spacing={3} sx={{ mb: 4 }}>
    <Grid size={{ xs: 12, lg: 8 }}>
      <LiquidGlassCard gradientPreset="freshGreen" isDarkMode={isDarkMode} sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderColor: 'primary.main' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} mb={2}>
          <Box><Typography variant="h5" fontWeight={900}>{t('feature.todayTitle')}</Typography><Typography variant="body2" color="text.secondary">{t('feature.todayOrder')}</Typography></Box>
          <Button variant="contained" onClick={onOpenMyWork}>{t('feature.openMyWork')}</Button>
        </Stack>
        {error ? <Alert severity="error" action={<Button onClick={onRetry}>{t('feedback.retry')}</Button>}>{t('feature.todayLoadError')}</Alert> : loading ? <CircularProgress size={24} /> : tasks.length ? <Stack gap={1}>{tasks.map(task => <Button key={task.taskId} variant="outlined" onClick={() => onOpenTask(task.taskId)} sx={{ justifyContent: 'space-between', gap: 2, minHeight: 48, textAlign: 'left' }}><Typography component="span" fontWeight={750} noWrap>{task.title}</Typography><Chip component="span" size="small" label={priorityLabel(task)} /></Button>)}</Stack> : <Alert severity="success">{t('feature.allClearToday')}</Alert>}
      </LiquidGlassCard>
    </Grid>
    <Grid size={{ xs: 12, lg: 4 }}>
      <LiquidGlassCard gradientPreset="freshGreen" isDarkMode={isDarkMode} sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
        <Typography variant="h6" fontWeight={800}>{t('feature.latestAchievement')}</Typography>
        {latestAchievement ? <Stack direction={{ xs: 'row', lg: 'column' }} alignItems="center" textAlign={{ xs: 'left', lg: 'center' }} gap={2} mt={2}>
          <AchievementArtwork artworkKey={latestAchievement.artworkKey || latestAchievement.badgeKey} rarity={latestAchievement.rarity || 'common'} size={88} />
          <Box minWidth={0}>
            <Typography fontWeight={850}>{translateRewardKey(t, latestAchievement.nameKey)}</Typography>
            <Typography variant="body2" color="text.secondary">{translateRewardKey(t, latestAchievement.requirementKey || latestAchievement.descriptionKey || latestAchievement.nameKey)}</Typography>
            <Typography variant="caption" color="text.secondary">{t('achievement.earnedOn', { date: formatLocalizedDate(new Date(latestAchievement.awardedAt), locale) })}</Typography>
            <Box><Button onClick={onOpenAchievements} sx={{ mt: 1 }}>{t('feature.showBadges')}</Button></Box>
          </Box>
        </Stack> : <Typography color="text.secondary" mt={2}>{t('feature.noAchievement')}</Typography>}
      </LiquidGlassCard>
    </Grid>
  </Grid>;
}
