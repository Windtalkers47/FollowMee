import { useState, useEffect } from 'react';
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
  Switch,
  FormControlLabel,
  FormGroup,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Contrast as ContrastIcon,
  BlurOn as BlurIcon,
  BorderAll as BorderAllIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  EmojiEvents as TrophyIcon,
  CheckCircle as DoneIcon,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../../store/store';
import { taskApi, likeApi, commentApi, Task, TaskLikeSummary, UserRank, UpdateTaskData } from '../../api/task.api';
import { userApi } from '../../api/user.api';
import TaskCard from '../../components/TaskCard';
import TaskCardLiquid from '../../components/TaskCard/TaskCardLiquid';
import { TaskForm } from '../../components/TaskForm/TaskForm';
import feedback from '../../services/feedback.service';
import { getTaskPermissions, hasAnyPermission } from '../../permissions/taskPermissions';
import { getBookedDates } from '../../utils/dateUtils';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { useTheme } from '@mui/material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import {
  gradientPresets,
  type GradientPresetKey,
  getGlassCardStyles,
  getGlassInputStyles,
  getGlassButtonStyles,
  getSegmentedControlStyles,
  getTextColorStyles,
} from '../../styles/liquidGlassStyles';

/* ================== Types ================== */
type TabPanelProps = {
  children: React.ReactNode;
  index: number;
  value: number;
};

// Dialog transition
const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/* ================== TabPanel ================== */
const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

/* ================== Task Feed Card ================== */
interface TaskFeedCardProps {
  task: Task;
  likeSummary?: TaskLikeSummary;
  onEdit?: (task: Task) => void;
  onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => void;
  onUnlike?: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onMarkDone?: (taskId: string) => void;
  onMarkUndone?: (taskId: string) => void;
  onApproveTask?: (taskId: string) => void;
  onStartProgress?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void;
}

const getEmbeddedLikeSummary = (task: Task): TaskLikeSummary | undefined => {
  if (!task._count) return undefined;
  const summary = {
    like: task._count.likes || 0,
    love: task._count.love || 0,
    laugh: task._count.laugh || 0,
    angry: task._count.angry || 0,
    wow: task._count.wow || 0,
    sad: task._count.sad || 0,
    userLike: task._count.userLike,
  };
  return { ...summary, total: summary.like + summary.love + summary.laugh + summary.angry + summary.wow + summary.sad };
};

const TaskFeedCard: React.FC<TaskFeedCardProps> = ({
  task,
  likeSummary,
  onEdit,
  onLike,
  onUnlike,
  onComment,
  onMarkDone,
  onMarkUndone,
  onApproveTask,
  onStartProgress,
  onCancel,
  onUpdateTaskStatus,
}) => {
  const { user } = useAppSelector((state) => state.auth);

  const permissions = getTaskPermissions({
    userId: user?.userId || 0,
    task,
  });

  const showActions = hasAnyPermission(permissions);

  // Use Liquid Glass TaskCard for better UI experience
  return (
    <TaskCardLiquid
      task={task}
      likeSummary={likeSummary}
      currentUserId={user?.userId || 0}
      permissions={permissions}
      onEdit={onEdit}
      onLike={onLike}
      onUnlike={onUnlike}
      onComment={onComment}
      onMarkDone={onMarkDone}
      onMarkUndone={onMarkUndone}
      onApproveTask={onApproveTask}
      onStartProgress={onStartProgress}
      onCancel={onCancel}
      onUpdateTaskStatus={onUpdateTaskStatus}
      showActions={showActions}
      compact={false} // Use full width for better social media feel
      showWorkflowActions={false}
    />
  );
};

/* ================== Page ================== */
const PostsPage = () => {
  const { t } = useUserPreferences();
  const { taskId } = useParams<{ taskId: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskLikeSummaries, setTaskLikeSummaries] = useState<Record<string, TaskLikeSummary>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [doneDialogOpen, setDoneDialogOpen] = useState(false);
  const [doneTaskData, setDoneTaskData] = useState<{ task: Task; newRank: UserRank } | null>(null);
  const [undoneDialogOpen, setUndoneDialogOpen] = useState(false);
  const [undoneTaskData, setUndoneTaskData] = useState<{ task: Task; newRank: UserRank } | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  
  // Liquid Glass UI Settings
  const { isLiquidGlassEnabled, liquidGlassSettings, updateLiquidGlassSettings } = useLiquidGlass();
  const theme = useTheme();
  
  // Detect dark mode from theme
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Safe gradient preset access with default fallback
  const currentGradientPreset = liquidGlassSettings?.gradientPreset || 'classicBluePurple';
  
  // Get safe preset with fallback
  const getCurrentPreset = () => {
    const preset = gradientPresets[currentGradientPreset as keyof typeof gradientPresets];
    return preset || gradientPresets.classicBluePurple;
  };
  const currentPreset = getCurrentPreset();
  
  // Get text colors based on settings
  const getTextColor = (variant: 'primary' | 'secondary' | 'tertiary' = 'primary') => 
    getTextColorStyles(isDarkMode, liquidGlassSettings?.increaseContrast || false, variant);

  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Fetch all completed tasks for the feed
  const { data: allTasksResponse, isLoading: allTasksLoading, error: allTasksError, refetch: refetchAllTasks } = useQuery({
    queryKey: ['all-tasks', activeTab, user?.userId],
    queryFn: () => taskApi.getTasks({
      status: 'done',
      assignedTo: activeTab === 1 ? user?.userId : undefined,
      limit: 30,
    }),
    enabled: activeTab === 0 || Boolean(user?.userId),
    staleTime: 30_000,
  });

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
    enabled: taskDialogOpen,
  });

  // Fetch tasks with search - only when explicitly searching
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search-tasks', searchQuery, activeTab, user?.userId],
    queryFn: () => taskApi.getTasks({ 
      search: searchQuery, 
      status: 'done', 
      assignedTo: activeTab === 1 ? user?.userId : undefined,
      limit: 30 
    }),
    enabled: false, // Disabled by default - only enable when search button is clicked
  });

  // Mutations
  const likeMutation = useMutation({
    mutationFn: ({ taskId, likeType }: { taskId: string; likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad' }) =>
      likeApi.createOrUpdateLike(taskId, { likeType }),
    onSuccess: (_, { taskId }) => {
      fetchLikeSummary(taskId);
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: likeApi.removeLike,
    onSuccess: (_, taskId) => {
      fetchLikeSummary(taskId);
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { comment: string } }) =>
      commentApi.createComment(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] }); // Refresh assigned tasks for comment count
    },
  });

  // Mark task as done mutation (submits for review)
  const markTaskDoneMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data?: { completionNote?: string } }) =>
      taskApi.markTaskAsDone(taskId, data),
    onSuccess: (response) => {
      feedback.fire({
        icon: 'success',
        title: 'Task Submitted for Review!',
        text: `"${response.task.title}" has been submitted for review. The task creator will review and approve it.`,
        confirmButtonText: 'Got it!'
      });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
    },
  });

  // Mark task as undone mutation (rejects from review or undoes done)
  const markTaskUndoneMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.markTaskAsUndone(taskId),
    onSuccess: (response) => {
      setUndoneTaskData({ task: response.task, newRank: response.userRank });
      setUndoneDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
    },
  });

  // Update task mutation (for status changes like start progress, cancel)
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) =>
      taskApi.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
    },
  });

  // Approve task mutation (for creators to approve from review to done)
  const approveTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.approveTask(taskId),
    onSuccess: (response) => {
      // Show success dialog - ONLY when task is actually approved to done
      setDoneTaskData({ task: response.task, newRank: response.userRank });
      setDoneDialogOpen(true);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => taskApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
    },
  });

  // Fetch like summaries for tasks
  const fetchLikeSummary = async (taskId: string) => {
    try {
      const summary = await likeApi.getTaskLikeSummary(taskId);
      setTaskLikeSummaries(prev => ({ ...prev, [taskId]: summary }));
    } catch (error) {
      console.error('Error fetching like summary:', error);
    }
  };

  useEffect(() => {
    const handleRealtimeReaction = async (event: Event) => {
      const taskId = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (!taskId) return;
      try {
        const summary = await likeApi.getTaskLikeSummary(taskId);
        setTaskLikeSummaries(prev => ({ ...prev, [taskId]: summary }));
      } catch (error) {
        console.error('Unable to refresh reaction summary:', error);
      }
    };
    window.addEventListener('followmee:reaction-updated', handleRealtimeReaction);
    return () => window.removeEventListener('followmee:reaction-updated', handleRealtimeReaction);
  }, []);

  // Search handlers
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      // Manually trigger the search query
      await queryClient.fetchQuery({
        queryKey: ['search-tasks', searchQuery, activeTab, user?.userId],
        queryFn: () => taskApi.getTasks({ 
          search: searchQuery, 
          status: 'done', 
          assignedTo: activeTab === 1 ? user?.userId : undefined,
          limit: 30 
        }),
      });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    refetchAllTasks();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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
      title: 'Are you sure?',
      text: 'This will move the task back to To Do. The assignee will need to work on it again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, undo it',
      cancelButtonText: 'Cancel'
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

  const bookedDates = getBookedDates(editingTask);

  const completedTasksList = isSearching ? (searchResults?.tasks || []) : (allTasksResponse?.tasks || []);

  const tabs = [
    { label: t('activity.allFilter'), key: 'all' },
    { label: t('activity.mineFilter'), key: 'mine' },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Note: Liquid Glass Settings moved to Settings page */}

      {/* Header */}
      <Box
        sx={{
          mb: 4,
          py: 1,
        }}
      >
        <Typography 
          variant="h3" 
          fontWeight="bold" 
          gutterBottom
          sx={{ color: getTextColor('primary') }}
        >
          {t('activity.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          {t('activity.subtitle')}
        </Typography>
        <Chip 
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
        />
      </Box>

      {/* Liquid Glass Search Section */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            fullWidth
            placeholder={t('activity.searchCompleted')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: getTextColor('secondary') }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClearSearch} size="small">
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{
              flex: 1,
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'background.paper',
              },
              '& .MuiInputBase-input': {
                color: getTextColor('primary'),
              },
              '& .MuiInputBase-input::placeholder': {
                color: getTextColor('tertiary'),
                opacity: 1,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={!searchQuery.trim() || searchLoading}
            startIcon={<SearchIcon />}
            sx={{ 
              minWidth: '120px',
              borderRadius: 2,
              opacity: !searchQuery.trim() || searchLoading ? 0.6 : 1,
            }}
          >
            {searchLoading ? t('activity.searching') : t('common.search')}
          </Button>
        </Box>
        {isSearching && (
          <Typography 
            variant="caption" 
            sx={{ 
              mt: 1, 
              display: 'block',
              color: getTextColor('tertiary'),
            }}
          >
            {t('activity.searchResults', { query: searchQuery })}
          </Typography>
        )}
      </Box>

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
      {allTasksError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('activity.loadError')}
        </Alert>
      )}

      {searchLoading || allTasksLoading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {completedTasksList.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Box textAlign="center" py={6}>
                <Typography variant="h6" color="text.secondary">{t('activity.emptyTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('activity.emptyHint')}</Typography>
              </Box>
            </Grid>
          ) : completedTasksList.map((task) => (
            <Grid size={{ xs: 12 }} key={task.taskId}>
              <TaskFeedCard
                task={task}
                likeSummary={taskLikeSummaries[task.taskId] || getEmbeddedLikeSummary(task)}
                onLike={handleLike}
                onUnlike={handleUnlike}
                onComment={handleComment}
              />
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Task Done Success Dialog */}
      <Dialog
        open={doneDialogOpen}
        TransitionComponent={SlideTransition}
        keepMounted
        onClose={handleCloseDoneDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <DoneIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" color="success.main" fontWeight="bold" component="div">
            {t('activity.completedTitle')}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          {doneTaskData && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {t('activity.completedText', { title: doneTaskData.task.title })}
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'success.50', 
                borderRadius: 2, 
                border: 2, 
                borderColor: 'success.main' 
              }}>
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  {t('activity.newRank', { rank: doneTaskData.newRank.rank })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('activity.completedTasks', { count: doneTaskData.newRank.completedTasks })}
                </Typography>
                {doneTaskData.newRank.rank <= 3 && (
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    {t('activity.topThree')}
                  </Typography>
                )}
                {doneTaskData.newRank.rank > 3 && (
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    {t('activity.keepClimbing')}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={handleCloseDoneDialog} 
            variant="contained" 
            color="success"
            size="large"
          >
            {t('activity.acknowledge')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Undone Dialog */}
      <Dialog
        open={undoneDialogOpen}
        TransitionComponent={SlideTransition}
        keepMounted
        onClose={handleCloseUndoneDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <TrophyIcon sx={{ fontSize: 44, mb: 1, color: 'primary.main' }} />
          <Typography variant="h6" color="warning.main" fontWeight="bold" component="div">
            {t('activity.reopenedTitle')}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          {undoneTaskData && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {t('activity.reopenedText', { title: undoneTaskData.task.title })}
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'warning.50', 
                borderRadius: 2, 
                border: 2, 
                borderColor: 'warning.main' 
              }}>
                <Typography variant="h6" color="warning.main" fontWeight="bold">
                  {t('activity.currentRank', { rank: undoneTaskData.newRank.rank })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('activity.completedTasks', { count: undoneTaskData.newRank.completedTasks })}
                </Typography>
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  {t('activity.takeTime')}
                </Typography>
                {undoneTaskData.newRank.rank <= 3 && (
                  <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    {t('activity.stillTopThree')}
                  </Typography>
                )}
                {undoneTaskData.newRank.rank > 3 && (
                  <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    {t('activity.setback')}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={handleCloseUndoneDialog} 
            variant="contained" 
            color="warning"
            size="large"
          >
            {t('activity.gotIt')}
          </Button>
        </DialogActions>
      </Dialog>

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
            // Handle date conversion for backend
            const { dueDateRange, createdAt, updatedAt, ...editableTaskData } = taskData;
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
              await updateTaskMutation.mutateAsync({
                taskId: editingTask.taskId,
                data: intent === 'publish' && editingTask.status === 'draft'
                  ? dataToSave as UpdateTaskData
                  : editableData as UpdateTaskData
              });
            } else {
              await createTaskMutation.mutateAsync(dataToSave as any);
            }
            setTaskDialogOpen(false);
            setEditingTask(undefined);
          } catch (error) {
            console.error('Error saving task:', error);
            throw error; // Re-throw to let TaskForm handle the error display
          }
        }}
      />
    </Box>
  );
};

export default PostsPage;
