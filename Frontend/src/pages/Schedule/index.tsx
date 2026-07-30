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
  UpdateTaskData, 
  TaskLikeSummary,
  bulkActionApi 
} from '../../api/task.api';
import { userApi } from '../../api/user.api';
import { likeApi } from '../../api/task.api';
import { TaskForm } from '../../components/TaskForm/TaskForm';
import { getBookedDates } from '../../utils/dateUtils';
import ScheduleTaskCard from '../../components/ScheduleTaskCard';
import SmartSuggestionsBar from '../../components/SmartSuggestions/SmartSuggestionsBar';
import SelectionModeTopBar from '../../components/SelectionMode/SelectionModeTopBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { useSmartSuggestions } from '../../hooks/useSmartSuggestions';
import { useSelectionKeyboard } from '../../hooks/useSelectionKeyboard';
import toast from '../../utils/toast';
import { taskStatusTokens } from '../../styles/designTokens';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

/* ================== Types ================== */
type TabPanelProps = {
  children: React.ReactNode;
  index: number;
  value: number;
};

type TaskStatus = 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

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
  const [taskLikeSummaries, setTaskLikeSummaries] = useState<Record<string, TaskLikeSummary>>({});
  const [sortBy, setSortBy] = useState<'updated_desc' | 'due_asc' | 'title_asc'>('updated_desc');
  const [dateFilter, setDateFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all');

  // Multi-select hook - using taskId as id
  const multiSelect = useMultiSelect<{ id: string }>();
  
  // Debug log
  React.useEffect(() => {
    console.log('[Schedule] multiSelect changed:', {
      isSelectionMode: multiSelect.isSelectionMode,
      selectedCount: multiSelect.selectedCount,
      selectedIds: Array.from(multiSelect.selectedIds),
      toggleSelect: typeof multiSelect.toggleSelect,
      enterSelectionMode: typeof multiSelect.enterSelectionMode
    });
  }, [multiSelect.isSelectionMode, multiSelect.selectedCount, multiSelect.toggleSelect]);

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

  // Smart suggestions hook
  const {
    suggestions,
    handleSuggestionAction,
    bulkUpdate,
    bulkDelete,
  } = useSmartSuggestions({
    onSuccess: () => {
      multiSelect.exitSelectionMode();
    }
  });

  // Keyboard shortcuts for selection mode
  useSelectionKeyboard({
    isSelectionMode: multiSelect.isSelectionMode,
    selectedCount: multiSelect.selectedCount,
    onSelectAll: () => multiSelect.selectAll(currentTabTasks),
    onDeselectAll: multiSelect.deselectAll,
    onExitSelectionMode: multiSelect.exitSelectionMode,
    onBulkAction: (action) => {
      if (action === 'done') bulkUpdate({ taskIds: Array.from(multiSelect.selectedIds), status: 'done' });
      if (action === 'start') bulkUpdate({ taskIds: Array.from(multiSelect.selectedIds), status: 'in_progress' });
      if (action === 'delete') {
        const selectedTaskIds = Array.from(multiSelect.selectedIds);
        if (selectedTaskIds.length > 0) {
          bulkDelete({ taskIds: selectedTaskIds });
        }
      }
    },
    enabled: true
  });

  // Handle search
  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasksResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', { search: searchQuery }],
    queryFn: () => taskApi.getTasks({
      search: searchQuery || undefined,
    }),
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  });

  const bookedDates = getBookedDates(editingTask);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => taskApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) =>
      taskApi.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
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
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
    },
  });

  const markTaskUndoneMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.markTaskAsUndone(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
      refetch();
    },
  });

  const approveTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.approveTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
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
        timer: 2000,
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
        timer: 2000,
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
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      await feedback.fire({
        title: t('common.error'),
        text: t('task.statusUpdateFailed'),
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

  // Fetch like summaries
  const fetchLikeSummary = async (taskId: string) => {
    try {
      const summary = await likeApi.getTaskLikeSummary(taskId);
      setTaskLikeSummaries(prev => ({ ...prev, [taskId]: summary }));
    } catch (error) {
      console.error('Error fetching like summary:', error);
    }
  };

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86400000);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 86400000);
    const matchesDate = (task: Task) => {
      if (dateFilter === 'all') return true;
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      if (dateFilter === 'overdue') return due < startOfToday && !['done', 'cancelled'].includes(task.status);
      if (dateFilter === 'today') return due >= startOfToday && due < endOfToday;
      return due >= startOfToday && due < endOfWeek;
    };
    return [...(tasksResponse?.tasks || [])]
      .filter(matchesDate)
      .sort((a, b) => {
        if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
        if (sortBy === 'due_asc') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
  }, [tasksResponse?.tasks, dateFilter, sortBy]);

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

  // Load like summaries
  React.useEffect(() => {
    filteredTasks?.forEach(task => {
      if (!taskLikeSummaries[task.taskId]) {
        fetchLikeSummary(task.taskId);
      }
    });
  }, [filteredTasks, taskLikeSummaries]);

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
        bulkUpdate({ taskIds: selectedTaskIds, status: 'done' });
        break;

      case 'start':
        bulkUpdate({ taskIds: selectedTaskIds, status: 'in_progress' });
        break;

      case 'todo':
        bulkUpdate({ taskIds: selectedTaskIds, status: 'todo' });
        break;

      case 'draft':
        bulkUpdate({ taskIds: selectedTaskIds, status: 'draft' });
        break;

      case 'review':
        bulkUpdate({ taskIds: selectedTaskIds, status: 'review' });
        break;

      case 'cancel':
        bulkUpdate({ taskIds: selectedTaskIds, status: 'cancelled' });
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

  return (
    <Box sx={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      {/* Smart Suggestions Bar */}
      {suggestions.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 3 }}>
          <SmartSuggestionsBar
            suggestions={suggestions}
            onActionClick={handleSuggestionAction}
          />
        </Box>
      )}

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
            {!multiSelect.isSelectionMode && multiSelect.selectedCount === 0 && (
              <Button
                variant="outlined"
                startIcon={<CheckBoxOutlineBlankIcon />}
                onClick={multiSelect.enterSelectionMode}
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
            <Select label={t('schedule.dueDate')} value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}>
              <MenuItem value="all">{t('schedule.anyDate')}</MenuItem>
              <MenuItem value="overdue">{t('schedule.overdue')}</MenuItem>
              <MenuItem value="today">{t('schedule.dueToday')}</MenuItem>
              <MenuItem value="week">{t('schedule.nextSevenDays')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>{t('schedule.sort')}</InputLabel>
            <Select label={t('schedule.sort')} value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
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
            const taskCount = groupedTasks[tab.key].length;
            
            return (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tabs.indexOf(tab))}
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
          Failed to load tasks. Please try again.
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
                  <Typography variant="h6">No {tab.label.toLowerCase()} tasks yet</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    Create a task to start planning work for your team.
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTaskDialogOpen(true)}>
                    Create task
                  </Button>
                </Box>
              ) : (
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
                  <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
                    {groupedTasks[tab.key].map((task) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={task.taskId}>
                        <ScheduleTaskCard
                          task={task}
                          likeSummary={taskLikeSummaries[task.taskId]}
                          currentUserId={user?.userId || 0}
                          isSelected={multiSelect.isSelected(task.taskId)}
                          onToggleSelect={multiSelect.toggleSelect}
                          isInSelectionMode={multiSelect.isSelectionMode}
                          onEnterSelectionMode={multiSelect.enterSelectionMode}
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
                          onCardClick={() => navigate(`/posts/${task.taskId}`)}
                        />
                      </Grid>
                    ))}
                  </Grid>
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
        onSave={async (taskData: any) => {
          try {
            const dataToSave = {
              ...taskData,
              startDate: taskData.dueDateRange?.[0] ? taskData.dueDateRange[0].toISOString() : taskData.startDate || null,
              endDate: taskData.dueDateRange?.[1] ? taskData.dueDateRange[1].toISOString() : taskData.endDate || null,
              dueDate: (!taskData.dueDateRange?.[0] && !taskData.startDate) ? 
                (taskData.dueDate instanceof Date ? taskData.dueDate.toISOString() : taskData.dueDate) : null
            };
            
            if (editingTask) {
              await updateTaskMutation.mutateAsync({ taskId: editingTask.taskId, data: dataToSave as UpdateTaskData });
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
        onClose={multiSelect.exitSelectionMode}
        isVisible={multiSelect.isSelectionMode}
        onBulkAction={(action) => {
          if (action === 'done') {
            bulkUpdate({ taskIds: Array.from(multiSelect.selectedIds), status: 'done' });
          } else if (action === 'start') {
            bulkUpdate({ taskIds: Array.from(multiSelect.selectedIds), status: 'in_progress' });
          } else if (action === 'delete') {
            const selectedTaskIds = Array.from(multiSelect.selectedIds);
            if (selectedTaskIds.length > 0) {
              bulkDelete({ taskIds: selectedTaskIds });
            }
          } else if (action === 'more') {
            // Open more menu - handled by the menu in TopBar
            toast.info('More actions coming soon');
          }
        }}
      />

    </Box>
  );
};

export default SchedulePage;
