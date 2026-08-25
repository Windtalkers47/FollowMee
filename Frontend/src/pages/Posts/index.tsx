import { useState, useRef } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Grid,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../../store/store';
import { taskApi, likeApi, commentApi, Task, UserRank, UpdateTaskData, CreateTaskData, type TaskListResponse } from '../../api/task.api';
import { rewardApi } from '../../api/reward.api';
import { toPng } from 'html-to-image';
import AchievementShareCard, { type AchievementShareEntry } from '../../components/AchievementShareCard';
import AchievementArtwork from '../../components/AchievementArtwork';
import CompletedWorkSearch from '../../components/CompletedWorkSearch';
import { translateRewardKey } from '../../utils/rewardPresentation';
import DuplicateTaskDialog from '../../components/DuplicateTaskDialog';
import { userApi } from '../../api/user.api';
import { TaskForm } from '../../components/TaskForm/TaskForm';
import feedback from '../../services/feedback.service';
import { getBookedDates } from '../../utils/dateUtils';
import { useTheme } from '@mui/material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import CompletedWorkTaskCard from '../../components/CompletedWorkTaskCard';
import CompletedWorkOutcomeDialogs from '../../components/CompletedWorkOutcomeDialogs';
import { getEmbeddedLikeSummary } from '../../utils/taskLikeSummary';
import { useCompletedWorkFeed } from '../../hooks/useCompletedWorkFeed';
import { PageEmpty, PageError, PageHeader, PageLoading, PageShell } from '../../components/PageState';
import { applyTaskMutationSnapshot } from '../../utils/taskMutationCache';

/* ================== Page ================== */
const PostsPage = () => {
  const { t } = useUserPreferences();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [duplicateTask, setDuplicateTask] = useState<Task | null>(null);
  const [doneDialogOpen, setDoneDialogOpen] = useState(false);
  const [doneTaskData, setDoneTaskData] = useState<{ task: Task; newRank: UserRank } | null>(null);
  const [undoneDialogOpen, setUndoneDialogOpen] = useState(false);
  const [undoneTaskData, setUndoneTaskData] = useState<{ task: Task; newRank: UserRank } | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  
  const theme = useTheme();
  const getTextColor = (variant: 'primary' | 'secondary' | 'tertiary' = 'primary') =>
    variant === 'primary' ? theme.palette.text.primary : theme.palette.text.secondary;

  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const rewardSummaryQuery = useQuery({ queryKey: ['rewards', 'summary'], queryFn: rewardApi.summary, staleTime: 30_000 });
  const incrementCommentCount = (taskId: string) => {
    const patch = (current: TaskListResponse | undefined) => current ? {
      ...current,
      tasks: current.tasks.map(task => task.taskId === taskId ? {
        ...task,
        _count: {
          likes: task._count?.likes || 0,
          love: task._count?.love || 0,
          laugh: task._count?.laugh || 0,
          angry: task._count?.angry || 0,
          ...task._count,
          comments: (task._count?.comments || 0) + 1,
        },
      } : task),
    } : current;
    queryClient.setQueriesData<TaskListResponse>({ queryKey: ['all-tasks'] }, patch);
    queryClient.setQueriesData<TaskListResponse>({ queryKey: ['search-tasks'] }, patch);
  };

  const {
    tasks: completedTasksList,
    taskLikeSummaries,
    refreshLikeSummary,
    runSearch,
    refetch: refetchAllTasks,
    loading: allTasksLoading,
    error: allTasksError,
    searchLoading,
  } = useCompletedWorkFeed({ activeTab, userId: user?.userId, searchQuery, isSearching });

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
    enabled: taskDialogOpen,
  });


  // Mutations
  const likeMutation = useMutation({
    mutationFn: ({ taskId, likeType }: { taskId: string; likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad' }) =>
      likeApi.createOrUpdateLike(taskId, { likeType }),
    onSuccess: (_, { taskId }) => {
      void refreshLikeSummary(taskId);
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: likeApi.removeLike,
    onSuccess: (_, taskId) => {
      void refreshLikeSummary(taskId);
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { comment: string } }) =>
      commentApi.createComment(taskId, data),
    onSuccess: (_, { taskId }) => {
      incrementCommentCount(taskId);
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  // Mark task as done mutation (submits for review)
  const markTaskDoneMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data?: { completionNote?: string } }) =>
      taskApi.markTaskAsDone(taskId, data),
    onSuccess: (response) => {
      feedback.fire({
        icon: 'success',
        title: t('task.submittedReviewTitle'),
        text: t('task.submittedReviewText', { title: response.task.title }),
        confirmButtonText: t('activity.gotIt')
      });
      const previous = completedTasksList.find(task => task.taskId === response.task.taskId);
      if (user?.userId) applyTaskMutationSnapshot(queryClient, response.task, user.userId, previous);
    },
  });

  // Mark task as undone mutation (rejects from review or undoes done)
  const markTaskUndoneMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.markTaskAsUndone(taskId),
    onSuccess: (response) => {
      setUndoneTaskData({ task: response.task, newRank: response.userRank });
      setUndoneDialogOpen(true);
      const previous = completedTasksList.find(task => task.taskId === response.task.taskId);
      if (user?.userId) applyTaskMutationSnapshot(queryClient, response.task, user.userId, previous);
    },
  });

  // Update task mutation (for status changes like start progress, cancel)
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) =>
      taskApi.updateTask(taskId, data),
    onSuccess: (task) => {
      const previous = completedTasksList.find(item => item.taskId === task.taskId);
      if (user?.userId) applyTaskMutationSnapshot(queryClient, task, user.userId, previous);
    },
  });

  // Approve task mutation (for creators to approve from review to done)
  const approveTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.approveTask(taskId),
    onSuccess: (response) => {
      const achievement = response.earnedAchievements?.[0];
      if (achievement) {
        void feedback.success({ title: translateRewardKey(t, achievement.nameKey), message: t('achievement.unlockedMessage'), importance: 'milestone', nextAction: { label: t('achievement.viewCollection'), onClick: () => navigate(`/rewards?tab=achievements&achievement=${achievement.badgeKey}`) } });
      } else {
        setDoneTaskData({ task: response.task, newRank: response.userRank });
        setDoneDialogOpen(true);
      }

      const previous = completedTasksList.find(task => task.taskId === response.task.taskId);
      if (user?.userId) applyTaskMutationSnapshot(queryClient, response.task, user.userId, previous);
      queryClient.invalidateQueries({ queryKey: ['rewards', 'summary'] });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => taskApi.createTask(data),
    onSuccess: (task) => {
      if (user?.userId) applyTaskMutationSnapshot(queryClient, task, user.userId);
    },
  });

  // Search handlers
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      await runSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    refetchAllTasks();
  };

  const handleLike = async (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => {
    await likeMutation.mutateAsync({ taskId, likeType });
  };

  const handleUnlike = async (taskId: string) => {
    await unlikeMutation.mutateAsync(taskId);
  };

  const handleComment = async (taskId: string, comment: string) => {
    await commentMutation.mutateAsync({ taskId, data: { comment } });
  };

  const handleMarkTaskDone = async (taskId: string) => {
    await markTaskDoneMutation.mutateAsync({ taskId });
  };

  const handleMarkTaskUndone = async (taskId: string) => {
    const result = await feedback.fire({
      title: t('task.reopenTitle'),
      text: t('task.reopenAssigneeText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('task.reopenConfirm'),
      cancelButtonText: t('common.cancel')
    });
    if (result.isConfirmed) {
      await markTaskUndoneMutation.mutateAsync(taskId);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    const result = await feedback.fire({
      title: t('task.approveTitle'),
      text: t('task.approveQuestion'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('task.approveConfirm'),
      cancelButtonText: t('common.cancel'),
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        feedback.showLoading();
        return approveTaskMutation.mutateAsync(taskId);
      }
    });

    if (result.isConfirmed) {
      await feedback.fire({
        title: t('task.approvedTitle'),
        text: t('task.approvedText'),
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleStartProgress = async (taskId: string) => {
    const result = await feedback.fire({
      title: t('task.startTitle'),
      text: t('task.startQuestion'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('task.startConfirm'),
      cancelButtonText: t('task.notYet'),
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        feedback.showLoading();
        return updateTaskMutation.mutateAsync({ 
          taskId, 
          data: { status: 'in_progress' as const } 
        });
      }
    });

    if (result.isConfirmed) {
      await feedback.fire({
        title: t('task.startedTitle'),
        text: `${t('activity.startedTitle')} ${t('activity.startedEncouragement')} ${t('activity.startedBody')}`,
        icon: 'success',
        confirmButtonText: t('task.startConfirm'),
        timer: 2000,
        showConfirmButton: true
      });
    }
  };

  const handleCancelTask = async (taskId: string) => {
    const result = await feedback.fire({
      title: t('task.cancelTitle'),
      text: t('task.cancelQuestion'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('task.cancelConfirm'),
      cancelButtonText: t('task.keep'),
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        feedback.showLoading();
        return updateTaskMutation.mutateAsync({ 
          taskId, 
          data: { status: 'cancelled' as const } 
        });
      }
    });

    if (result.isConfirmed) {
      await feedback.fire({
        title: t('task.cancelledTitle'),
        text: t('task.cancelledText'),
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await updateTaskMutation.mutateAsync({ 
        taskId, 
        data: { status } 
      });
      
      const statusMessages = {
        'todo': 'Task moved to To Do',
        'in_progress': 'Task started',
        'review': 'Task submitted for review',
        'done': 'Task completed',
        'cancelled': 'Task cancelled',
        'draft': 'Task moved to Draft'
      };
      
      await feedback.fire({
        title: t('task.statusUpdated'),
        text: statusMessages[status] || t('task.statusUpdatedText'),
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch {
      await feedback.fire({
        title: t('common.error'),
        text: t('task.statusUpdateFailed'),
        icon: 'error',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleCloseDoneDialog = () => {
    setDoneDialogOpen(false);
    setDoneTaskData(null);
  };

  const handleCloseUndoneDialog = () => {
    setUndoneDialogOpen(false);
    setUndoneTaskData(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  // Keep the existing workflow callbacks available while the feed intentionally
  // hides workflow actions; extraction must not change permission behaviour.
  void handleMarkTaskDone;
  void handleMarkTaskUndone;
  void handleApproveTask;
  void handleStartProgress;
  void handleCancelTask;
  void handleUpdateTaskStatus;
  void handleEditTask;

  const bookedDates = getBookedDates(editingTask);

  const achievementRef = useRef<HTMLDivElement | null>(null);
  const [shareFormat, setShareFormat] = useState<'square' | 'story'>('square');
  const [isSharingAchievement, setIsSharingAchievement] = useState(false);
  const latestAchievement = rewardSummaryQuery.data?.latestAchievement;
  const latestAchievementEntry: AchievementShareEntry | undefined = latestAchievement
    ? {
        title: translateRewardKey(t, latestAchievement.nameKey),
        description: translateRewardKey(t, latestAchievement.requirementKey || latestAchievement.descriptionKey || latestAchievement.nameKey),
        artworkKey: latestAchievement.artworkKey || latestAchievement.badgeKey,
        rarity: latestAchievement.rarity || 'common',
        earnedDate: t('achievement.earnedOn', { date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(latestAchievement.awardedAt)) }),
      }
    : undefined;
  const exportAchievement = async (format: 'square' | 'story', nativeShare = false) => {
    if (!achievementRef.current || !latestAchievementEntry) return;
    setShareFormat(format);
    setIsSharingAchievement(true);
    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const dataUrl = await toPng(achievementRef.current, { pixelRatio: 1, cacheBust: true, width: 1080, height: format === 'story' ? 1920 : 1080 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `followmee-achievement-${format}.png`, { type: 'image/png' });
      if (nativeShare && navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: latestAchievementEntry.title });
      else { const link = document.createElement('a'); link.href = dataUrl; link.download = file.name; link.click(); }
    } catch {
      feedback.error(t('feedback.failed'), t('feedback.tryAgain'));
    } finally {
      setIsSharingAchievement(false);
    }
  };

  const tabs = [
    { label: t('activity.allFilter'), key: 'all' },
    { label: t('activity.mineFilter'), key: 'mine' },
  ];

  return (
    <PageShell maxWidth={1200}>
      <PageHeader
        title={t('activity.title')}
        subtitle={t('activity.subtitle')}
        actions={<Chip
          label={t('activity.approvedCount', { count: completedTasksList.length })}
          size="small"
          sx={{
            bgcolor: 'action.selected',
            color: 'primary.dark',
            fontWeight: 600,
            '& .MuiChip-label': {
              color: 'inherit',
              fontWeight: 600,
            },
          }}
        />}
      />

      <Paper variant="outlined" sx={{ mb: 3, p: { xs: 2, md: 2.5 }, borderRadius: 3, boxShadow: 'none' }}>
        <Typography variant="overline" color="primary.main">{t('feature.latestAchievement')}</Typography>
        {latestAchievementEntry ? <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={2.5}>
          <AchievementArtwork artworkKey={latestAchievementEntry.artworkKey} rarity={latestAchievementEntry.rarity} size={96} />
          <Box flex={1} minWidth={0}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h5" fontWeight={900}>{latestAchievementEntry.title}</Typography>
              <Chip size="small" label={latestAchievementEntry.rarity.toUpperCase()} />
            </Stack>
            <Typography color="text.secondary" mt={0.5}>{latestAchievementEntry.description}</Typography>
            <Typography variant="caption" color="text.secondary">{latestAchievementEntry.earnedDate}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} width={{ xs: '100%', md: 'auto' }}>
            <Button variant="contained" disabled={isSharingAchievement} onClick={() => void exportAchievement('square', true)}>{t('achievement.share')}</Button>
            <Button variant="outlined" disabled={isSharingAchievement} onClick={() => void exportAchievement('story')}>{t('achievement.saveStory')}</Button>
            <Button variant="text" disabled={isSharingAchievement} onClick={() => void exportAchievement('square')}>{t('achievement.saveSquare')}</Button>
            <Button variant="text" onClick={() => navigate('/rewards?tab=achievements')}>{t('achievement.viewCollection')}</Button>
          </Stack>
          <Box sx={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }} aria-hidden>
            <AchievementShareCard ref={achievementRef} entry={latestAchievementEntry} format={shareFormat} brandLabel={t('feature.followMeeAchievement')} achievementLabel={t('feature.followMeeAchievement')} />
          </Box>
        </Stack> : <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
          <Typography color="text.secondary" flex={1}>{t('feature.noAchievement')}</Typography>
          <Button variant="outlined" onClick={() => navigate('/rewards?tab=missions')}>{t('rewards.openMyWork')}</Button>
        </Stack>}
      </Paper>

      <CompletedWorkSearch value={searchQuery} searching={searchLoading} active={isSearching} colors={{ primary: getTextColor('primary'), secondary: getTextColor('secondary'), tertiary: getTextColor('tertiary') }} t={t} onChange={setSearchQuery} onSearch={handleSearch} onClear={handleClearSearch} />

      {/* iOS-style Segmented Control Tabs */}
      <Box sx={{ mb: 3 }}>
        <Paper
          elevation={0}
          sx={{
            display: 'inline-flex',
            width: 'auto',
            minWidth: 200,
            p: 0.5,
            borderRadius: 2,
            backgroundColor: 'action.hover',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue: number) => setActiveTab(newValue)}
            sx={{
              '& .MuiTabs-indicator': {
                display: 'none',
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.key}
                label={tab.label}
                {...{ id: `posts-tab-${index}`, 'aria-controls': `posts-tabpanel-${index}` }}
                sx={{
                  borderRadius: 2,
                  minHeight: 36,
                  minWidth: 100,
                  textTransform: 'none',
                  fontWeight: 500,
                  transition: 'background-color .18s ease, color .18s ease',
                  color: activeTab === index 
                    ? getTextColor('primary') 
                    : getTextColor('secondary'),
                  '&.Mui-selected': {
                    backgroundColor: 'background.paper',
                    boxShadow: 'none',
                    fontWeight: 600,
                    color: getTextColor('primary'),
                  },
                }}
              />
            ))}
          </Tabs>
        </Paper>
      </Box>

      {/* Error Display */}
      {allTasksError && <Box mb={2}><PageError title={t('activity.loadError')} message={t('feedback.networkHelp')} retryLabel={t('feedback.retry')} onRetry={() => void refetchAllTasks()} /></Box>}

      {searchLoading || allTasksLoading ? (
        <PageLoading label={t('feedback.loadingPage')} />
      ) : (
        <Grid container spacing={2}>
          {completedTasksList.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <PageEmpty title={t('activity.emptyTitle')} message={t('activity.emptyHint')} />
            </Grid>
          ) : completedTasksList.map((task) => (
            <Grid size={{ xs: 12 }} key={task.taskId}>
              <CompletedWorkTaskCard
                task={task}
                likeSummary={taskLikeSummaries[task.taskId] || getEmbeddedLikeSummary(task)}
                onLike={handleLike}
                onUnlike={handleUnlike}
                onComment={handleComment}
                onDuplicate={setDuplicateTask}
              />
            </Grid>
          ))}
        </Grid>
      )}
      
      <DuplicateTaskDialog task={duplicateTask} open={Boolean(duplicateTask)} onClose={() => setDuplicateTask(null)} />

      <CompletedWorkOutcomeDialogs
        completed={doneDialogOpen ? doneTaskData : null}
        reopened={undoneDialogOpen ? undoneTaskData : null}
        t={t}
        onCloseCompleted={handleCloseDoneDialog}
        onCloseReopened={handleCloseUndoneDialog}
      />

      {/* Task Form */}
      <TaskForm
        open={taskDialogOpen}
        task={editingTask}
        users={users || []}
        bookedDates={bookedDates}
        onClose={() => {
          setTaskDialogOpen(false);
          setEditingTask(undefined);
        }}
        onSave={async (taskData, intent) => {
          try {
            // Handle date conversion for backend
            const { dueDateRange, createdAt, updatedAt, ...editableTaskData } = taskData;
            void createdAt;
            void updatedAt;
            const dataToSave = {
              ...editableTaskData,
              status: intent === 'publish'
                ? 'todo'
                : intent === 'draft'
                  ? 'draft'
                  : taskData.status,
              // Handle date range - convert Date objects to ISO strings
              startDate: dueDateRange?.[0] ? dueDateRange[0].toISOString() : taskData.startDate || null,
              endDate: dueDateRange?.[1] ? dueDateRange[1].toISOString() : taskData.endDate || null,
              // Keep dueDate for backward compatibility (single date)
              dueDate: (!dueDateRange?.[0] && !taskData.startDate) ?
                (taskData.dueDate instanceof Date ? taskData.dueDate.toISOString() : taskData.dueDate) : null
            };

            if (editingTask) {
              const { status, ...editableData } = dataToSave;
              void status;
              await updateTaskMutation.mutateAsync({
                taskId: editingTask.taskId,
                data: intent === 'publish' && editingTask.status === 'draft'
                  ? dataToSave as UpdateTaskData
                  : editableData as UpdateTaskData
              });
            } else {
              await createTaskMutation.mutateAsync(dataToSave as CreateTaskData);
            }
            setTaskDialogOpen(false);
            setEditingTask(undefined);
          } catch (error) {
            console.error('Error saving task:', error);
            throw error; // Re-throw to let TaskForm handle the error display
          }
        }}
      />
    </PageShell>
  );
};

export default PostsPage;
