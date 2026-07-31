import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowForward, FactCheck, PlayArrow, RateReview, Schedule as ScheduleIcon } from '@mui/icons-material';
import { taskApi, Task } from '../../api/task.api';
import { useAppSelector } from '../../store/store';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import feedback from '../../services/feedback.service';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import TaskFocusCard from '../../components/SmartSuggestions/TaskFocusCard';

type WorkFilter = 'all' | 'todo' | 'in_progress' | 'review' | 'approval' | 'overdue' | 'due_today' | 'due_soon';

const MyWorkPage = () => {
  const { t } = useUserPreferences();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<WorkFilter>('all');
  const userId = useAppSelector((state) => state.auth.user?.userId);
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-work', userId],
    queryFn: () => taskApi.getMyWork({ limit: 50 }),
    enabled: !!userId,
    staleTime: 15_000,
  });

  const actionMutation = useMutation({
    mutationFn: ({ task, action }: { task: Task; action: 'start' | 'submit_review' }) =>
      action === 'start'
        ? taskApi.updateTask(task.taskId, { status: 'in_progress' })
        : taskApi.submitTaskForReview(task.taskId),
    onSuccess: (_updatedTask, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-work', userId] });
      feedback.success({
        title: t('myWork.updated'),
        message: t('myWork.updatedText'),
        importance: variables.action === 'submit_review' ? 'milestone' : 'routine',
        nextAction: variables.action === 'submit_review'
          ? { label: t('myWork.open'), onClick: () => navigate(`/tasks/${variables.task.taskId}`) }
          : undefined,
      });
    },
    onError: () => feedback.error(t('myWork.updateFailed'), t('feedback.tryAgain')),
  });

  const sections = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    const soonEnd = todayStart + 4 * 24 * 60 * 60 * 1000;
    const matchesFilter = (task: Task) => {
      if (filter === 'all') return true;
      if (filter === 'approval') return task.attentionReason === 'approval_required';
      const due = task.endDate || task.dueDate;
      const dueTime = due ? new Date(due).getTime() : 0;
      if (filter === 'overdue') return Boolean(dueTime && dueTime < todayStart);
      if (filter === 'due_today') return dueTime >= todayStart && dueTime < tomorrowStart;
      if (filter === 'due_soon') return dueTime >= tomorrowStart && dueTime < soonEnd;
      return task.status === filter;
    };
    const items = (data?.items || []).filter(matchesFilter);
    return [
      {
        key: 'approval',
        title: t('myWork.approvalRequired'),
        tasks: items.filter((task) => task.attentionReason === 'approval_required'),
        color: 'warning' as const,
      },
      {
        key: 'attention',
        title: t('myWork.needsAttention'),
        tasks: items.filter((task) => task.status === 'todo' && task.attentionReason !== 'approval_required'),
        color: 'warning' as const,
      },
      {
        key: 'progress',
        title: t('myWork.inProgress'),
        tasks: items.filter((task) => task.status === 'in_progress'),
        color: 'info' as const,
      },
      {
        key: 'review',
        title: t('myWork.waitingReview'),
        tasks: items.filter((task) => task.status === 'review' && task.attentionReason !== 'approval_required'),
        color: 'secondary' as const,
      },
    ].filter((section) => section.tasks.length > 0);
  }, [data?.items, filter, t]);

  const getContext = (task: Task) => {
    const actor = task.workflow?.nextActor?.displayName;
    if (task.attentionReason === 'approval_required') {
      const assignee = task.assignedToUser
        ? `${task.assignedToUser.userName} ${task.assignedToUser.userLastName || ''}`.trim()
        : t('myWork.assignee');
      return t('myWork.submittedBy', { name: assignee });
    }
    if (task.status === 'review') return t('myWork.waitingForCreator', { name: actor || t('myWork.creator') });
    if (task.status === 'in_progress') return t('myWork.inProgressHint');
    return t('myWork.readyHint');
  };

  const getAction = (task: Task) => {
    if (task.workflow?.primaryAction === 'review' || task.attentionReason === 'approval_required') {
      return { label: t('myWork.reviewWork'), icon: <FactCheck />, run: () => navigate(`/tasks/${task.taskId}`) };
    }
    if (task.workflow?.canSubmitReview) {
      return {
        label: t('myWork.submitReview'),
        icon: <RateReview />,
        run: () => actionMutation.mutate({ task, action: 'submit_review' }),
      };
    }
    if (task.workflow?.primaryAction === 'start' || task.status === 'todo') {
      return {
        label: t('myWork.start'),
        icon: <PlayArrow />,
        run: () => actionMutation.mutate({ task, action: 'start' }),
      };
    }
    return { label: t('myWork.open'), icon: <ArrowForward />, run: () => navigate(`/tasks/${task.taskId}`) };
  };

  if (isLoading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{t('myWork.loadFailed')}</Alert>;

  const summaries: Array<{ key: WorkFilter; label: string; count: number }> = [
    { key: 'todo', label: t('schedule.todo'), count: data?.counts.todo || 0 },
    { key: 'in_progress', label: t('schedule.inProgress'), count: data?.counts.inProgress || 0 },
    { key: 'review', label: t('schedule.review'), count: data?.counts.review || 0 },
    { key: 'overdue', label: t('myWork.overdue'), count: data?.counts.overdue || 0 },
  ];

  return (
    <Box sx={{ pb: { xs: 8, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1} mb={3}>
        <Box>
          <Typography variant="h3" fontWeight={750}>{t('myWork.title')}</Typography>
          <Typography color="text.secondary">{t('myWork.subtitle')}</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ScheduleIcon />} onClick={() => navigate('/schedule')}>{t('myWork.openSchedule')}</Button>
      </Stack>

      <TaskFocusCard
        scope="personal"
        focus={data?.focus}
        onFilter={(target) => setFilter(target as WorkFilter)}
      />
      {data?.focus && !data.focus.primary && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t('focus.personal.empty')}
        </Typography>
      )}

      <Grid container spacing={1.5} mb={3}>
        {summaries.map((summary) => (
          <Grid key={summary.key} size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ borderColor: filter === summary.key ? 'primary.main' : 'divider' }}>
              <CardActionArea onClick={() => setFilter((current) => current === summary.key ? 'all' : summary.key)}>
                <CardContent>
                  <Typography variant="h4" fontWeight={700}>{summary.count}</Typography>
                  <Typography color="text.secondary">{summary.label}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {sections.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h6">{t('myWork.allClear')}</Typography>
            <Typography color="text.secondary">{t('myWork.allClearHint')}</Typography>
          </CardContent>
        </Card>
      ) : sections.map((section) => (
        <Box key={section.key} mb={3}>
          <Stack direction="row" alignItems="center" gap={1} mb={1.25}>
            <Typography variant="h6" fontWeight={700}>{section.title}</Typography>
            <Chip size="small" label={section.tasks.length} color={section.color} />
          </Stack>
          <Stack spacing={1.5}>
            {section.tasks.map((task) => {
              const action = getAction(task);
              const dueValue = task.endDate || task.dueDate;
              const end = dueValue ? new Date(dueValue) : null;
              const overdue = Boolean(end && end.getTime() < Date.now());
              return (
                <Card key={task.taskId} data-task-id={task.taskId} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', p: { xs: 1.5, sm: 2 } }}>
                    {task.imageUrl && (
                      <Box
                        component="img"
                        src={getOptimizedImageUrl(task.imageUrl, 160)}
                        alt=""
                        loading="lazy"
                        sx={{ width: { xs: 64, sm: 96 }, height: { xs: 64, sm: 72 }, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
                      />
                    )}
                    <Box flex={1} minWidth={0}>
                      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                        <Typography fontWeight={700}>{task.title}</Typography>
                        <Chip size="small" label={task.status.replace('_', ' ')} color={overdue ? 'error' : section.color} />
                      </Stack>
                      <Typography variant="body2" color="text.primary">{getContext(task)}</Typography>
                      <Typography variant="caption" color={overdue ? 'error.main' : 'text.secondary'}>
                        {end ? `${overdue ? t('myWork.overdue') : t('myWork.due')} ${end.toLocaleDateString()}` : t('myWork.noDueDate')}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={action.icon}
                      disabled={actionMutation.isPending}
                      onClick={action.run}
                      sx={{ minWidth: { xs: 44, sm: 132 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } } }}
                    >
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{action.label}</Box>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Box>
  );
};

export default MyWorkPage;
