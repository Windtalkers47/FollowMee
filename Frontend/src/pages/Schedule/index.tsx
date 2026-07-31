import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  CircularProgress,
  Alert,
  useTheme,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/store';
import feedback from '../../services/feedback.service';
import { 
  taskApi, 
  Task, 
  CreateTaskData, 
  UpdateTaskData
} from '../../api/task.api';
import { userApi } from '../../api/user.api';
import { likeApi } from '../../api/task.api';
import { TaskForm } from '../../components/TaskForm/TaskForm';
import { getBookedDates } from '../../utils/dateUtils';
import ScheduleTaskCard from '../../components/ScheduleTaskCard';
import TaskFocusCard from '../../components/SmartSuggestions/TaskFocusCard';
import SelectionModeTopBar from '../../components/SelectionMode/SelectionModeTopBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { useTaskBulkActions } from '../../hooks/useTaskBulkActions';
import { useSelectionKeyboard } from '../../hooks/useSelectionKeyboard';
import toast from '../../utils/toast';
import { taskStatusTokens } from '../../styles/designTokens';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { isAllowedTaskTransition } from '../../utils/taskWorkflow';

/* ================== Types ================== */
type TabPanelProps = {
  children: React.ReactNode;
  index: number;
  value: number;
};

type TaskStatus = 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
const tabKeys: Array<'all' | TaskStatus> = ['all', 'draft', 'todo', 'in_progress', 'review', 'done', 'cancelled'];

/* ================== TabPanel ================== */
const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

/* ================== Page ================== */
const SchedulePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useUserPreferences();
  const isDarkMode = theme.palette.mode === 'dark';
  const [activeTab, setActiveTab] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [sortBy, setSortBy] = useState<'updated_desc' | 'due_asc' | 'title_asc'>('updated_desc');
  const [dateFilter, setDateFilter] = useState<'all' | 'overdue' | 'today' | 'soon' | 'week'>('all');
  const [page, setPage] = useState(1);
  const [creatorOnlySelection, setCreatorOnlySelection] = useState(false);

  // Multi-select hook - using taskId as id
  const multiSelect = useMultiSelect<{ id: string }>();
  const exitBulkMode = React.useCallback(() => {
    multiSelect.exitSelectionMode();
    setCreatorOnlySelection(false);
    setPage(1);
  }, [multiSelect.exitSelectionMode]);
  
  // Auto Scroll to Task Cards when entering Selection Mode
  React.useEffect(() => {
    if (multiSelect.isSelectionMode) {
      // Delay slightly for TopBar animation to complete
      const timeoutId = setTimeout(() => {
        // Scroll directly to task cards section
        const taskListElement = document.querySelector('[role="tabpanel"]');
        if (taskListElement) {
          taskListElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [multiSelect.isSelectionMode]);

  // Bulk lifecycle mutations are intentionally separate from read-only Focus insights.
  const { bulkUpdate, bulkDelete } = useTaskBulkActions(exitBulkMode);

  // Handle search
  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasksResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', {
      search: searchQuery,
      status: tabKeys[activeTab],
      dateFilter,
      sortBy,
      page,
      creatorOnlySelection,
    }],
    queryFn: () => taskApi.getTasks({
      search: searchQuery || undefined,
      status: tabKeys[activeTab] === 'all' ? undefined : tabKeys[activeTab] as TaskStatus,
      dueFilter: dateFilter,
      sort: sortBy,
      page,
      limit: 24,
      includeFocus: true,
      createdBy: creatorOnlySelection ? user?.userId : undefined,
    }),
    placeholderData: (previous) => previous,
  });

  const getValidBulkTaskIds = (status: Task['status']) => {
    const selectedTaskIds = Array.from(multiSelect.selectedIds);
    const selectedTasks = selectedTaskIds
      .map(taskId => tasksResponse?.tasks.find(task => task.taskId === taskId))
      .filter((task): task is Task => Boolean(task));
    const validIds = selectedTasks
      .filter(task => isAllowedTaskTransition(task, status))
      .map(task => task.taskId);
    const skipped = selectedTaskIds.length - validIds.length;
    if (skipped > 0) {
      toast.warning(`This action is not available for every selected task.`);
      return [];
    }
    return validIds;
  };
  const isPrivilegedRole = Boolean(user?.roles?.some((role) => ['admin', 'superadmin'].includes(role.toLowerCase())));
  const hasOwnedTaskOnPage = Boolean(tasksResponse?.tasks.some((task) => task.createdBy === user?.userId));
  const canEnterBulkMode = isPrivilegedRole || hasOwnedTaskOnPage;

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
    enabled: taskDialogOpen,
  });

  const bookedDates = getBookedDates(editingTask);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => taskApi.createTask(data),
    onSuccess: (createdTask) => {
      if (createdTask.assignedTo === user?.userId && ['todo', 'in_progress', 'review'].includes(createdTask.status)) {
        queryClient.setQueryData(['my-work', user?.userId], (current: any) => current ? { ...current, items: [createdTask, ...current.items] } : current);
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work', user?.userId] });
      void feedback.success({
        title: createdTask.status === 'draft' ? t('task.form.saveDraft') : t('myWork.updated'),
        message: createdTask.status === 'draft' ? createdTask.title : t('myWork.updatedText'),
        importance: createdTask.status === 'draft' ? 'routine' : 'milestone',
        nextAction: createdTask.status === 'draft'
          ? undefined
          : { label: t('myWork.open'), onClick: () => navigate(`/tasks/${createdTask.taskId}`) },
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) =>
      taskApi.updateTask(taskId, data),
    onSuccess: (updatedTask, variables) => {
      queryClient.setQueryData(['my-work', user?.userId], (current: any) => {
        if (!current) return current;
        const active = ['todo', 'in_progress', 'review'].includes(updatedTask.status);
        const items = current.items.filter((task: Task) => task.taskId !== updatedTask.taskId);
        if (active && (updatedTask.assignedTo === user?.userId || (updatedTask.createdBy === user?.userId && updatedTask.status === 'review'))) {
          items.unshift(updatedTask);
        }
        return { ...current, items };
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work', user?.userId] });
      if (!variables.data.status) {
        void feedback.success({ title: t('myWork.updated'), message: updatedTask.title });
      } else if (variables.data.status === 'todo' && editingTask?.status === 'draft') {
        void feedback.success({
          title: t('myWork.updated'),
          message: t('myWork.updatedText'),
          importance: 'milestone',
          nextAction: { label: t('myWork.open'), onClick: () => navigate(`/tasks/${updatedTask.taskId}`) },
        });
      }
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const likeTaskMutation = useMutation({
    mutationFn: ({ taskId, likeType }: { taskId: string; likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad' }) =>
      likeApi.createOrUpdateLike(taskId, { likeType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const unlikeTaskMutation = useMutation({
    mutationFn: likeApi.removeLike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const markTaskDoneMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data?: { completionNote?: string } }) =>
      taskApi.markTaskAsDone(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const markTaskUndoneMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.markTaskAsUndone(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      refetch();
    },
  });

  const approveTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.approveTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      refetch();
    },
  });

  // Handlers
  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleLikeTask = (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => {
    likeTaskMutation.mutate({ taskId, likeType });
  };

  const handleUnlikeTask = (taskId: string) => {
    unlikeTaskMutation.mutate(taskId);
  };

  const handleCommentTask = (taskId: string, comment: string) => {
    console.log('Comment on task:', taskId, comment);
  };

  const handleMarkDone = (taskId: string) => {
    markTaskDoneMutation.mutate({ taskId });
  };

  const handleMarkUndone = (taskId: string) => {
    markTaskUndoneMutation.mutate(taskId);
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
        importance: 'milestone',
        timer: 5000,
        showConfirmButton: false
      });
    }
  };

  const handleRejectTask = async (taskId: string) => {
    const result = await feedback.fire({
      title: t('task.rejectTitle'),
      text: t('task.rejectQuestion'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('task.rejectConfirm'),
      cancelButtonText: t('common.cancel'),
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        feedback.showLoading();
        return markTaskUndoneMutation.mutateAsync(taskId);
      }
    });

    if (result.isConfirmed) {
      await feedback.fire({
        title: t('task.rejectedTitle'),
        text: t('task.rejectedText'),
        icon: 'success',
        importance: 'milestone',
        timer: 5000,
        showConfirmButton: false
      });
    }
  };

  const handleUndoTask = async (taskId: string) => {
    const result = await feedback.fire({
      title: t('task.reopenTitle'),
      text: t('task.reopenQuestion'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('task.reopenConfirm'),
      cancelButtonText: t('common.cancel'),
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        feedback.showLoading();
        return markTaskUndoneMutation.mutateAsync(taskId);
      }
    });

    if (result.isConfirmed) {
      await feedback.fire({
        title: t('task.reopenedTitle'),
        text: t('task.reopenedText'),
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
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
    const task = tasksResponse?.tasks.find(item => item.taskId === taskId);
    if (task && !isAllowedTaskTransition(task, status)) {
      await feedback.fire({
        title: t('task.invalidTransitionTitle'),
        text: t('task.invalidTransitionText'),
        icon: 'warning',
        timer: 2200,
        showConfirmButton: false,
      });
      return;
    }
    try {
      await updateTaskMutation.mutateAsync({ 
        taskId, 
        data: { status } 
      });
      
      const statusMessages: Record<string, string> = {
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
        importance: status === 'review' || status === 'done' ? 'milestone' : 'routine',
        timer: status === 'review' || status === 'done' ? 5000 : 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      const apiError = error?.response?.data;
      await feedback.fire({
        title: apiError?.code === 'INVALID_TASK_TRANSITION' ? t('task.invalidTransitionTitle') : t('common.error'),
        text: apiError?.code === 'INVALID_TASK_TRANSITION' ? t('task.invalidTransitionText') : t('task.statusUpdateFailed'),
        icon: 'error',
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
        text: t('task.startedText'),
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const filteredTasks = tasksResponse?.tasks || [];

  const groupedTasks = useMemo(() => filteredTasks.reduce((groups, task) => {
    groups.all.push(task);
    groups[task.status]?.push(task);
    return groups;
  }, {
    all: [] as Task[],
    draft: [] as Task[],
    todo: [] as Task[],
    in_progress: [] as Task[],
    review: [] as Task[],
    done: [] as Task[],
    cancelled: [] as Task[],
  }), [filteredTasks]);

  const getLikeSummary = (task: Task) => {
    const counts = task._count;
    if (!counts) return undefined;
    const total = counts.likes + counts.love + counts.laugh + counts.angry + (counts.wow || 0) + (counts.sad || 0);
    return {
      like: counts.likes,
      love: counts.love,
      laugh: counts.laugh,
      angry: counts.angry,
      wow: counts.wow || 0,
      sad: counts.sad || 0,
      total,
      userLike: counts.userLike,
    };
  };

  const tabs = useMemo(() => [
    { label: t('schedule.allTasks'), key: 'all' as const, color: taskStatusTokens.draft.color },
    { label: t('schedule.drafts'), key: 'draft' as const, color: taskStatusTokens.draft.color },
    { label: t('schedule.todo'), key: 'todo' as const, color: taskStatusTokens.todo.color },
    { label: t('schedule.inProgress'), key: 'in_progress' as const, color: taskStatusTokens.in_progress.color },
    { label: t('schedule.review'), key: 'review' as const, color: taskStatusTokens.review.color },
    { label: t('schedule.done'), key: 'done' as const, color: taskStatusTokens.done.color },
    { label: t('schedule.cancelled'), key: 'cancelled' as const, color: taskStatusTokens.cancelled.color },
  ], [t]);

  // Handle bulk actions from toolbar
  const handleBulkAction = async (action: 'delete' | 'done' | 'start' | 'todo' | 'draft' | 'review' | 'cancel' | 'assign') => {
    const selectedTaskIds = Array.from(multiSelect.selectedIds);
    
    if (selectedTaskIds.length === 0) {
      toast.warning(t('schedule.noneSelected'));
      return;
    }

    switch (action) {
      case 'delete':
        const deleteResult = await feedback.fire({
          title: t('task.deleteManyTitle', { count: selectedTaskIds.length }),
          text: t('common.cannotUndo'),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: t('task.deleteManyConfirm'),
          cancelButtonText: t('common.cancel'),
          reverseButtons: true,
        });

        if (deleteResult.isConfirmed) {
          bulkDelete({ taskIds: selectedTaskIds });
        }
        break;

      case 'done':
        {
          const validIds = getValidBulkTaskIds('done');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'done' });
        }
        break;

      case 'start':
        {
          const validIds = getValidBulkTaskIds('in_progress');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'in_progress' });
        }
        break;

      case 'todo':
        {
          const validIds = getValidBulkTaskIds('todo');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'todo' });
        }
        break;

      case 'draft':
        toast.warning(t('task.invalidTransitionText'));
        break;

      case 'review':
        {
          const validIds = getValidBulkTaskIds('review');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'review' });
        }
        break;

      case 'cancel':
        {
          const validIds = getValidBulkTaskIds('cancelled');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'cancelled' });
        }
        break;

      case 'assign':
        // TODO: Open assign dialog
        toast.info(t('schedule.assignComingSoon'));
        break;
    }
  };

  // Get current tab tasks for select all - convert to { id: string } format
  const currentTabTasks = useMemo(
    () => (groupedTasks[tabs[activeTab].key] || []).map(task => ({ id: task.taskId })),
    [activeTab, groupedTasks, tabs],
  );
  const allowedBulkActions = useMemo(() => {
    const selected = Array.from(multiSelect.selectedIds)
      .map((taskId) => tasksResponse?.tasks.find((task) => task.taskId === taskId))
      .filter((task): task is Task => Boolean(task));
    if (selected.length === 0) return [];
    const actions: Array<'delete' | 'done' | 'start' | 'todo' | 'in_progress' | 'review' | 'cancelled'> = [];
    if (selected.every((task) => task.createdBy === user?.userId)) actions.push('delete');
    if (selected.every((task) => task.workflow?.canStart && isAllowedTaskTransition(task, 'in_progress'))) actions.push('start', 'in_progress');
    if (selected.every((task) => task.workflow?.canSubmitReview && isAllowedTaskTransition(task, 'review'))) actions.push('review');
    if (selected.every((task) => task.workflow?.canApprove && isAllowedTaskTransition(task, 'done'))) actions.push('done');
    if (selected.every((task) => task.workflow?.canPublish && isAllowedTaskTransition(task, 'todo'))) actions.push('todo');
    if (selected.every((task) => task.workflow?.canCancel && isAllowedTaskTransition(task, 'cancelled'))) actions.push('cancelled');
    return actions;
  }, [multiSelect.selectedIds, tasksResponse?.tasks, user?.userId]);

  // Keyboard shortcuts follow the exact same all-selected capability contract
  // as the visible toolbar. They never bypass confirmation or partially mutate.
  useSelectionKeyboard({
    isSelectionMode: multiSelect.isSelectionMode,
    selectedCount: multiSelect.selectedCount,
    onSelectAll: () => multiSelect.selectAll(currentTabTasks),
    onDeselectAll: multiSelect.deselectAll,
    onExitSelectionMode: exitBulkMode,
    onBulkAction: (action) => {
      const requiredAction = action === 'start' ? 'start' : action;
      if (!allowedBulkActions.includes(requiredAction)) {
        toast.warning(t('schedule.actionUnavailableForSelection'));
        return;
      }
      void handleBulkAction(action);
    },
    enabled: true,
  });

  return (
    <Box sx={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 3 }}>
        <TaskFocusCard
          scope="organization"
          focus={tasksResponse?.focus}
          onFilter={(target) => {
            if (target === 'review') {
              setActiveTab(tabKeys.indexOf('review'));
              setDateFilter('all');
            } else {
              setActiveTab(0);
              setDateFilter(target as typeof dateFilter);
            }
            setPage(1);
          }}
        />
      </Box>

      {/* Header with Search */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, mb: 3 }}>
        {/* Top Row */}
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          mb={2}
          sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem' } }}>
            {t('schedule.title')}
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap">
            {/* Select Button - Same style as Customer page */}
            {!multiSelect.isSelectionMode && multiSelect.selectedCount === 0 && canEnterBulkMode && (
              <Button
                variant="outlined"
                startIcon={<CheckBoxOutlineBlankIcon />}
                onClick={() => {
                  setCreatorOnlySelection(true);
                  setActiveTab(0);
                  setDateFilter('all');
                  setSearchInput('');
                  setSearchQuery('');
                  setPage(1);
                  multiSelect.enterSelectionMode();
                }}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  px: 2.5,
                  py: 1.25,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {t('schedule.selectTasks')}
              </Button>
            )}
            
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setTaskDialogOpen(true)}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                px: 2.5,
                py: 1.25,
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              {t('schedule.createTask')}
            </Button>
          </Box>
        </Box>

        {/* Search Bar */}
        <Box 
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            background: 'background.paper',
            borderRadius: 3,
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          <TextField
            fullWidth
            placeholder={t('schedule.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            variant="outlined"
            sx={{
              flex: '1 1 auto',
              minWidth: 0,
              width: '100%',
              '& .MuiInputBase-root': { fontSize: '0.9375rem', background: 'transparent' },
              '& .MuiOutlinedInput-root': {
                border: 'none',
                borderRadius: 2.5,
                background: 'transparent',
                '& fieldset': { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
              },
              '& .MuiInputBase-input': {
                py: 1,
                color: isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
                '&::placeholder': { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }} />
                </InputAdornment>
              ),
              endAdornment: searchInput && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch} sx={{ p: 0.5 }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {searchInput.trim() && (
            <Tooltip title={t('common.search')}>
              <IconButton onClick={handleSearch} sx={{ p: 1.25, borderRadius: 2 }}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ width: 1, height: 24, borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}` }} />
          <Tooltip title={t('common.refresh')}>
            <span>
              <IconButton
                aria-label={t('schedule.refreshTasks')}
                onClick={() => refetch()}
                disabled={isLoading}
                sx={{ p: 1.25, borderRadius: 2 }}
              >
                <RefreshIcon sx={{ fontSize: 22, animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '180px 200px' }, gap: 1.5, mt: 1.5, justifyContent: 'end' }}>
          <FormControl size="small">
            <InputLabel>{t('schedule.dueDate')}</InputLabel>
            <Select label={t('schedule.dueDate')} value={dateFilter} onChange={(event) => {
              setDateFilter(event.target.value as typeof dateFilter);
              setPage(1);
            }}>
              <MenuItem value="all">{t('schedule.anyDate')}</MenuItem>
              <MenuItem value="overdue">{t('schedule.overdue')}</MenuItem>
              <MenuItem value="today">{t('schedule.dueToday')}</MenuItem>
              <MenuItem value="soon">{t('schedule.nextThreeDays')}</MenuItem>
              <MenuItem value="week">{t('schedule.nextSevenDays')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>{t('schedule.sort')}</InputLabel>
            <Select label={t('schedule.sort')} value={sortBy} onChange={(event) => {
              setSortBy(event.target.value as typeof sortBy);
              setPage(1);
            }}>
              <MenuItem value="updated_desc">{t('schedule.recentlyUpdated')}</MenuItem>
              <MenuItem value="due_asc">{t('schedule.dueDate')}</MenuItem>
              <MenuItem value="title_asc">{t('schedule.titleAZ')}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Segmented Control */}
        <Box 
          sx={{
            mt: 2,
            display: 'flex',
            p: 0.5,
            background: 'action.hover',
            borderRadius: 2,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tabs.indexOf(tab);
            const taskCount = tasksResponse?.statusCounts?.[tab.key]
              ?? (tab.key === tabs[activeTab].key ? tasksResponse?.total || 0 : 0);
            
            return (
              <Button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tabs.indexOf(tab));
                  setPage(1);
                }}
                sx={{
                  px: 2,
                  py: 1,
                  minWidth: 'fit-content',
                  borderRadius: 1.5,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'primary.contrastText' : 'text.primary',
                  opacity: isActive ? 1 : 0.72,
                  transition: 'background-color .18s ease, color .18s ease',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                  },
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {tab.label}
                  </Typography>
                  <Box 
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      minWidth: '20px',
                      textAlign: 'center',
                      background: isActive ? (isDarkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent',
                      color: isActive ? 'primary.contrastText' : 'text.secondary',
                      opacity: isActive ? 0.9 : 1,
                    }}
                  >
                    {taskCount}
                  </Box>
                </Box>
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, mx: { xs: 2, sm: 3, md: 4 } }}>
          {t('schedule.loadError')}
        </Alert>
      )}

      {/* Task Lists */}
      {tabs.map((tab, index) => (
        <TabPanel key={tab.key} value={activeTab} index={index}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {groupedTasks[tab.key].length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Typography variant="h6">{t('schedule.emptyTitle', { status: tab.label.toLowerCase() })}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    {t('schedule.emptyText')}
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTaskDialogOpen(true)}>
                    {t('schedule.createTask')}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
                  <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
                    {groupedTasks[tab.key].map((task) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4, xl: 3 }} key={task.taskId}>
                        <ScheduleTaskCard
                          task={task}
                          likeSummary={getLikeSummary(task)}
                          currentUserId={user?.userId || 0}
                          isSelected={multiSelect.isSelected(task.taskId)}
                          onToggleSelect={task.createdBy === user?.userId ? multiSelect.toggleSelect : undefined}
                          isInSelectionMode={multiSelect.isSelectionMode}
                          onEnterSelectionMode={task.createdBy === user?.userId ? multiSelect.enterSelectionMode : undefined}
                          onEdit={(task: Task) => {
                            setEditingTask(task);
                            setTaskDialogOpen(true);
                          }}
                          onDelete={handleDeleteTask}
                          onComment={handleCommentTask}
                          onMarkDone={handleMarkDone}
                          onMarkUndone={handleMarkUndone}
                          onUndo={handleUndoTask}
                          onApprove={handleApproveTask}
                          onReject={handleRejectTask}
                          onCancel={handleCancelTask}
                          onStartProgress={handleStartProgress}
                          onUpdateTaskStatus={handleUpdateTaskStatus}
                          onCardClick={() => navigate(`/tasks/${task.taskId}`)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  {(tasksResponse?.totalPages || 1) > 1 && (
                    <Box display="flex" justifyContent="center" mt={3}>
                      <Pagination
                        page={page}
                        count={tasksResponse?.totalPages || 1}
                        onChange={(_, nextPage) => {
                          setPage(nextPage);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        color="primary"
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </TabPanel>
      ))}

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
        onSave={async (taskData: any, intent) => {
          try {
            const { dueDateRange, createdAt, updatedAt, ...editableTaskData } = taskData;
            const dataToSave = {
              ...editableTaskData,
              status: intent === 'publish'
                ? 'todo'
                : intent === 'draft'
                  ? 'draft'
                  : taskData.status,
              startDate: dueDateRange?.[0] ? dueDateRange[0].toISOString() : taskData.startDate || null,
              endDate: dueDateRange?.[1] ? dueDateRange[1].toISOString() : taskData.endDate || null,
              dueDate: (!dueDateRange?.[0] && !taskData.startDate) ?
                (taskData.dueDate instanceof Date ? taskData.dueDate.toISOString() : taskData.dueDate) : null
            };
            
            if (editingTask) {
              const { status, ...editableData } = dataToSave;
              const updateData = intent === 'publish' && editingTask.status === 'draft'
                ? dataToSave
                : editableData;
              await updateTaskMutation.mutateAsync({ taskId: editingTask.taskId, data: updateData as UpdateTaskData });
            } else {
              await createTaskMutation.mutateAsync(dataToSave as CreateTaskData);
            }
            setTaskDialogOpen(false);
            setEditingTask(undefined);
          } catch (error) {
            console.error('Error saving task:', error);
            throw error;
          }
        }}
      />

      {/* Selection Mode - Fixed Bottom Bar (Dime-style) */}
      <SelectionModeTopBar
        selectedCount={multiSelect.selectedCount}
        totalCount={currentTabTasks.length}
        areAllSelected={multiSelect.areAllSelected(currentTabTasks)}
        onSelectAll={() => multiSelect.selectAll(currentTabTasks)}
        onDeselectAll={multiSelect.deselectAll}
        onClose={exitBulkMode}
        isVisible={multiSelect.isSelectionMode}
        allowedActions={allowedBulkActions}
        onBulkAction={(action) => {
          if (action === 'delete') void handleBulkAction('delete');
          else if (action === 'start' || action === 'in_progress') void handleBulkAction('start');
          else if (action === 'done') void handleBulkAction('done');
          else if (action === 'todo') void handleBulkAction('todo');
          else if (action === 'review') void handleBulkAction('review');
          else if (action === 'cancelled') void handleBulkAction('cancel');
        }}
      />

    </Box>
  );
};

export default SchedulePage;
