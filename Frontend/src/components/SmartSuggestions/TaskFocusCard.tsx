import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, TrackChanges } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { TaskFocusKind, TaskFocusSummary } from '../../api/task.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface TaskFocusCardProps {
  scope: 'personal' | 'organization';
  focus?: TaskFocusSummary;
  onFilter: (targetFilter: string) => void;
}

const kinds: TaskFocusKind[] = [
  'approval_required',
  'overdue',
  'due_today',
  'due_soon',
  'waiting_review',
];

const countFor = (focus: TaskFocusSummary, kind: TaskFocusKind) => {
  if (kind === 'approval_required') return focus.counts.approvalRequired || 0;
  if (kind === 'due_today') return focus.counts.dueToday;
  if (kind === 'due_soon') return focus.counts.dueSoon;
  if (kind === 'waiting_review') return focus.counts.waitingReview || 0;
  return focus.counts.overdue;
};

const targetFor = (kind: TaskFocusKind, scope: 'personal' | 'organization') => ({
  approval_required: 'approval',
  overdue: 'overdue',
  due_today: scope === 'personal' ? 'due_today' : 'today',
  due_soon: scope === 'personal' ? 'due_soon' : 'soon',
  waiting_review: 'review',
})[kind];

const TaskFocusCard = ({ scope, focus, onFilter }: TaskFocusCardProps) => {
  const { t } = useUserPreferences();
  const storageKey = `followmee-focus-dismissed:${scope}`;
  const [dismissedRevision, setDismissedRevision] = useState(() => sessionStorage.getItem(storageKey));

  useEffect(() => {
    setDismissedRevision(sessionStorage.getItem(storageKey));
  }, [focus?.revision, storageKey]);

  const visibleCounts = useMemo(
    () => focus ? kinds
      .map((kind) => ({ kind, count: countFor(focus, kind), target: targetFor(kind, scope) }))
      .filter((item) => item.count > 0) : [],
    [focus, scope],
  );

  if (!focus || !focus.primary || dismissedRevision === focus.revision) return null;

  const dismiss = () => {
    sessionStorage.setItem(storageKey, focus.revision);
    setDismissedRevision(focus.revision);
  };

  return (
    <Paper
      elevation={0}
      role="region"
      aria-label={t(`focus.${scope}.title`)}
      sx={(theme) => ({
        mb: 2.5,
        p: { xs: 1.75, sm: 2.25 },
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.32 : 0.18)}`,
        bgcolor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.secondary.main, 0.12)
          : alpha(theme.palette.secondary.light, 0.2),
        color: 'text.primary',
      })}
    >
      <Stack direction="row" gap={1.5} alignItems="flex-start">
        <Box
          sx={(theme) => ({
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: 'secondary.dark',
            bgcolor: alpha(theme.palette.secondary.main, 0.14),
          })}
        >
          <TrackChanges fontSize="small" />
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography variant="subtitle1" fontWeight={750}>
            {t(`focus.${scope}.title`)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {t(`focus.${focus.primary.kind}.message`, { count: focus.primary.count })}
          </Typography>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant="contained"
              onClick={() => onFilter(focus.primary!.targetFilter)}
              sx={{ minHeight: 44, px: 2 }}
            >
              {t('focus.viewTasks')}
            </Button>
            {visibleCounts.map((item) => (
              <Chip
                key={item.kind}
                size="small"
                clickable
                onClick={() => onFilter(item.target)}
                label={`${t(`focus.${item.kind}.label`)} ${item.count}`}
                sx={{ minHeight: 32, bgcolor: 'background.paper' }}
              />
            ))}
          </Stack>
        </Box>
        <Tooltip title={t('focus.dismiss')}>
          <IconButton aria-label={t('focus.dismiss')} onClick={dismiss} sx={{ width: 44, height: 44 }}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
};

export default TaskFocusCard;
