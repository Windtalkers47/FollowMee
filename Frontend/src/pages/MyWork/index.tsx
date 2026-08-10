import { useEffect, useMemo, useState } from 'react';
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
  MenuItem,
  Menu,
  IconButton,
  TextField,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowForward, Block, ContentCopy, FactCheck, MoreVert, PlayArrow, RateReview, Save, Schedule as ScheduleIcon } from '@mui/icons-material';
import { taskApi, Task } from '../../api/task.api';
import { useAppSelector } from '../../store/store';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedDate } from '../../utils/localeFormat';
import feedback from '../../services/feedback.service';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import TaskFocusCard from '../../components/SmartSuggestions/TaskFocusCard';
import DuplicateTaskDialog from '../../components/DuplicateTaskDialog';
import { useFocusSession } from '../../hooks/useFocusSession';

type WorkFilter = 'all' | 'todo' | 'in_progress' | 'review' | 'approval' | 'overdue' | 'due_today' | 'due_soon' | 'blocked';

const MyWorkPage = () => {
  const { t, locale } = useUserPreferences();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<WorkFilter>('all');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuTask, setMenuTask] = useState<Task | null>(null);
  const [duplicateTask, setDuplicateTask] = useState<Task | null>(null);
  const currentView = useMemo(() => ({ filter }), [filter]);
  const { focusTarget, enterFocus, leaveFocus, takePreviousView } = useFocusSession(currentView);
  const focusFilter = focusTarget as WorkFilter | null;
  const effectiveFilter = focusFilter || filter;
  const focusTargetLabel = focusFilter === 'overdue'
    ? t('myWork.overdue')
    : focusFilter === 'due_today'
      ? t('schedule.dueToday')
      : focusFilter === 'due_soon'
        ? t('schedule.nextThreeDays')
        : focusFilter === 'approval'
          ? t('myWork.approvalRequired')
          : focusFilter === 'review'
            ? t('schedule.review')
            : focusFilter || '';
  const applyNormalFilter = (next: WorkFilter) => {
    leaveFocus();
    setFocusedTaskId(null);
    setFilter(next);
  };
  const restorePreviousView = () => {
    const snapshot = takePreviousView();
    setFocusedTaskId(null);
    if (snapshot) setFilter(snapshot.filter);
  };
  const userId = useAppSelector((state) => state.auth.user?.userId);
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-work', userId],
    queryFn: () => taskApi.getMyWork({ limit: 50 }),
    enabled: !!userId,
    staleTime: 15_000,
  });
  const savedViews = useQuery({ queryKey: ['saved-views', 'my-work'], queryFn: () => taskApi.getSavedViews('my-work') });
  const saveViewMutation = useMutation({
    mutationFn: () => taskApi.saveView({ pageKey: 'my-work', name: `My Work · ${filter}`, filters: { filter }, isDefault: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-views', 'my-work'] }),
  });

  const actionMutation = useMutation<any, Error, { task: Task; action: 'start' | 'submit_review' | 'block' }>({
    mutationFn: ({ task, action }: { task: Task; action: 'start' | 'submit_review' | 'block' }) =>
      action === 'start'
        ? taskApi.updateTask(task.taskId, { status: 'in_progress', expectedVersion: task.version } as any)
        : action === 'block' ? taskApi.setBlocked(task.taskId, true, 'Blocked from My Work quick action', task.version)
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
      if (effectiveFilter === 'all') return true;
      if (effectiveFilter === 'approval') return task.attentionReason === 'approval_required';
      if (effectiveFilter === 'blocked') return Boolean(task.blockedAt);
      const due = task.endDate || task.dueDate;
      const dueTime = due ? new Date(due).getTime() : 0;
      if (effectiveFilter === 'overdue') return Boolean(dueTime && dueTime < todayStart);
      if (effectiveFilter === 'due_today') return dueTime >= todayStart && dueTime < tomorrowStart;
      if (effectiveFilter === 'due_soon') return dueTime >= tomorrowStart && dueTime < soonEnd;
      return task.status === effectiveFilter;
    };
    const items = (data?.items || []).filter(matchesFilter);
    return [
      {
        key: 'overdue', title: t('myWork.overdue'),
        tasks: items.filter(task => { const due = task.endDate || task.dueDate; return due && new Date(due).getTime() < todayStart; }),
        color: 'error' as const,
      },
      {
        key: 'blocked', title: t('feature.blocked'), tasks: items.filter(task => Boolean(task.blockedAt)), color: 'error' as const,
      },
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
  }, [data?.items, effectiveFilter, t]);

  useEffect(() => {
    if (!focusFilter || sections.length === 0 || sections[0].tasks.length === 0) return;
    const taskId = sections[0].tasks[0].taskId;
    setFocusedTaskId(taskId);
    const timeout = window.setTimeout(() => {
      const element = document.querySelector<HTMLElement>(`[data-task-id="${taskId}"]`);
      element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      element?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [focusFilter, sections]);

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
    if (task.workflow?.canSetBlocked && !task.blockedAt) {
      return { label: t('feature.markBlocked'), icon: <Block />, run: () => actionMutation.mutate({ task, action: 'block' }) };
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
        onFilter={(target) => { enterFocus(target); setFocusedTaskId(null); }}
      />
      {focusFilter && <Alert severity="info" sx={{ mb: 2 }} action={<Stack direction="row" gap={1}><Button size="small" onClick={restorePreviousView}>{t('feature.backToPreviousView')}</Button><Button size="small" onClick={() => applyNormalFilter('all')}>{t('feature.showAllTasks')}</Button></Stack>}>
        {t('feature.focusModeActive', { filter: focusTargetLabel })}
      </Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2}>
        <TextField select size="small" label={t('feature.savedViews')} value="" sx={{ minWidth: 220 }} onChange={(event) => {
          const view = savedViews.data?.find(item => String(item.savedViewId) === event.target.value);
          const savedFilter = view?.filters?.filter;
          if (typeof savedFilter === 'string') applyNormalFilter(savedFilter as WorkFilter);
        }}>
          {(savedViews.data || []).map(view => <MenuItem key={view.savedViewId} value={String(view.savedViewId)}>{view.name}</MenuItem>)}
        </TextField>
        <Button startIcon={<Save />} onClick={() => saveViewMutation.mutate()} disabled={saveViewMutation.isPending}>{t('feature.saveCurrentView')}</Button>
        <Chip clickable label={t('feature.blocked')} color={effectiveFilter === 'blocked' ? 'error' : 'default'} onClick={() => applyNormalFilter(filter === 'blocked' ? 'all' : 'blocked')} />
      </Stack>
      {data?.focus && !data.focus.primary && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t('focus.personal.empty')}
        </Typography>
      )}

      <Grid container spacing={1.5} mb={3}>
        {summaries.map((summary) => (
          <Grid key={summary.key} size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ borderColor: effectiveFilter === summary.key ? 'primary.main' : 'divider' }}>
              <CardActionArea onClick={() => applyNormalFilter(filter === summary.key ? 'all' : summary.key)}>
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
                <Card key={task.taskId} tabIndex={-1} data-task-id={task.taskId} variant="outlined" sx={{ borderRadius: 3, borderColor: focusedTaskId === task.taskId ? 'primary.main' : 'divider', borderWidth: focusedTaskId === task.taskId ? 2 : 1, bgcolor: focusedTaskId === task.taskId ? 'action.selected' : 'background.paper', boxShadow: focusedTaskId === task.taskId ? theme => `0 0 0 4px ${theme.palette.primary.main}22` : 'none', '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 3 } }}>
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
                        <Chip
                          size="small"
                          label={t(`taskStatus.${task.status === 'in_progress' ? 'inProgress' : task.status}` as Parameters<typeof t>[0])}
                          color={overdue ? 'error' : section.color}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.primary">{getContext(task)}</Typography>
                      <Typography variant="caption" color={overdue ? 'error.main' : 'text.secondary'}>
                        {end ? `${overdue ? t('myWork.overdue') : t('myWork.due')} ${formatLocalizedDate(end, locale)}` : t('myWork.noDueDate')}
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
                    {task.workflow?.canDuplicate && <IconButton aria-label={t('scheduleCard.moreActions')} onClick={(event) => { setMenuAnchor(event.currentTarget); setMenuTask(task); }}><MoreVert /></IconButton>}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Box>
      ))}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuTask(null); }}>
        {menuTask?.workflow?.canDuplicate && <MenuItem onClick={() => { setDuplicateTask(menuTask); setMenuAnchor(null); setMenuTask(null); }}><ContentCopy fontSize="small" sx={{ mr: 1.5 }} />{t('feature.duplicateTask')}</MenuItem>}
      </Menu>
      <DuplicateTaskDialog task={duplicateTask} open={Boolean(duplicateTask)} onClose={() => setDuplicateTask(null)} />
    </Box>
  );
};

export default MyWorkPage;
