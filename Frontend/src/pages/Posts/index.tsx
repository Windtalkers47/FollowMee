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
import { TaskForm } from '../../components/TaskForm/TaskForm';
import Swal from 'sweetalert2';
import { getTaskPermissions, hasAnyPermission } from '../../permissions/taskPermissions';
import { getBookedDates } from '../../utils/dateUtils';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
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

  return (
    <TaskCard
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
    />
  );
};

/* ================== Page ================== */
const PostsPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskLikeSummaries, setTaskLikeSummaries] = useState<Record<string, TaskLikeSummary>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [doneDialogOpen, setDoneDialogOpen] = useState(false);
  const [doneTaskData, setDoneTaskData] = useState<{ task: Task; newRank: UserRank } | null>(null);
  const [undoneDialogOpen, setUndoneDialogOpen] = useState(false);
  const [undoneTaskData, setUndoneTaskData] = useState<{ task: Task; newRank: UserRank } | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  
  // Liquid Glass UI Settings
  const { isLiquidGlassEnabled, liquidGlassSettings, updateLiquidGlassSettings } = useLiquidGlass();
  
  // Detect dark mode from theme - fallback to false if theme state doesn't exist
  const isDarkMode = false; // Can be extended when theme state is available
  
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

  // Fetch assigned tasks
  const { data: assignedTasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['assigned-tasks', user?.userId],
    queryFn: () => taskApi.getTasksAssignedToMe(),
    enabled: !!user?.userId,
  });

  // Fetch all completed tasks for the feed
  const { data: allTasksResponse, isLoading: allTasksLoading, error: allTasksError, refetch: refetchAllTasks } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => taskApi.getTasks({ status: 'done', includeStats: true }),
  });

  // Fetch top performers
  const { data: topPerformersData } = useQuery({
    queryKey: ['top-performers'],
    queryFn: () => taskApi.getTopPerformers(5),
  });

  // Fetch current user's rank
  const { data: userRankData } = useQuery({
    queryKey: ['user-rank', user?.userId],
    queryFn: () => taskApi.getMyRank(),
    enabled: !!user?.userId,
  });

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  });

  // Fetch tasks with search - only when explicitly searching
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search-tasks', searchQuery],
    queryFn: () => taskApi.getTasks({ 
      search: searchQuery, 
      status: 'done', 
      includeStats: true,
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
      Swal.fire({
        icon: 'success',
        title: 'Task Submitted for Review!',
        text: `"${response.task.title}" has been submitted for review. The task creator will review and approve it.`,
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Got it!'
      });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['top-performers'] });
      queryClient.invalidateQueries({ queryKey: ['user-rank'] });
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
      queryClient.invalidateQueries({ queryKey: ['top-performers'] });
      queryClient.invalidateQueries({ queryKey: ['user-rank'] });
    },
  });

  // Update task mutation (for status changes like start progress, cancel)
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) =>
      taskApi.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['top-performers'] });
      queryClient.invalidateQueries({ queryKey: ['user-rank'] });
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
      queryClient.invalidateQueries({ queryKey: ['top-performers'] });
      queryClient.invalidateQueries({ queryKey: ['user-rank'] });
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

  // Update top performers when data changes
  useEffect(() => {
    if (topPerformersData) {
      setTopPerformers(topPerformersData);
    }
  }, [topPerformersData]);

  // Update user rank when data changes
  useEffect(() => {
    if (userRankData) {
      setUserRank(userRankData);
    }
  }, [userRankData]);

  // Load like summaries for visible tasks
  useEffect(() => {
    const tasks = isSearching ? searchResults?.tasks : (activeTab === 0 ? assignedTasks : allTasksResponse?.tasks);
    tasks?.forEach(task => {
      if (!taskLikeSummaries[task.taskId]) {
        fetchLikeSummary(task.taskId);
      }
    });
  }, [assignedTasks, allTasksResponse, searchResults, activeTab, taskLikeSummaries, isSearching]);

  // Handle navigation from dashboard (when taskId is in URL)
  useEffect(() => {
    if (taskId) {
      // Switch to the appropriate tab based on task status
      const allTasks = [...(assignedTasks || []), ...(allTasksResponse?.tasks || [])];
      const targetTask = allTasks.find(t => t.taskId === taskId);
      
      if (targetTask) {
        // Switch to the correct tab
        if (targetTask.assignedTo === user?.userId) {
          setActiveTab(0); // My Tasks tab
        } else {
          setActiveTab(1); // Team Feed tab
        }
        
        // Scroll to the task after a short delay to ensure rendering
        setTimeout(() => {
          const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a highlight effect
            taskElement.classList.add('highlight-task');
            setTimeout(() => {
              taskElement.classList.remove('highlight-task');
            }, 2000);
          }
        }, 500);
      }
    }
  }, [taskId, assignedTasks, allTasksResponse, user?.userId]);

  // Search handlers
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      // Manually trigger the search query
      await queryClient.fetchQuery({
        queryKey: ['search-tasks', searchQuery],
        queryFn: () => taskApi.getTasks({ 
          search: searchQuery, 
          status: 'done', 
          includeStats: true,
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
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will move the task back to To Do. The assignee will need to work on it again.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, undo it',
      cancelButtonText: 'Cancel'
    });
    if (result.isConfirmed) {
      await markTaskUndoneMutation.mutateAsync(taskId);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Approve Task',
      text: 'Are you sure you want to approve this task? This will mark it as completed.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4caf50',
      cancelButtonColor: '#d32f2f',
      confirmButtonText: 'Yes, approve it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        Swal.showLoading();
        return approveTaskMutation.mutateAsync(taskId);
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        title: 'Approved!',
        text: 'Task has been approved successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleStartProgress = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Start Working?',
      text: 'Ready to start working on this task? Let\'s do this! ',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Let\'s go! ',
      cancelButtonText: 'Not yet',
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        Swal.showLoading();
        return updateTaskMutation.mutateAsync({ 
          taskId, 
          data: { status: 'in_progress' as const } 
        });
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        title: 'Let\'s Get Started! ',
        html: `
          <div style="text-align: center;">
            <p>Awesome! You're now working on this task. </p>
            <div style="margin: 20px 0; padding: 16px; background: #e3f2fd; border: 2px solid #2196f3; border-radius: 8px;">
              <h4 style="margin: 0 0 8px 0; color: #1976d2;"> You've got this! </h4>
              <p style="margin: 0; color: #666;">Time to make some progress! </p>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Working on it!',
        confirmButtonColor: '#2196f3',
        timer: 2000,
        showConfirmButton: true
      });
    }
  };

  const handleCancelTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Cancel Task?',
      text: 'Are you sure you want to cancel this task? This will move it to the cancelled tab.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No, keep it',
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        Swal.showLoading();
        return updateTaskMutation.mutateAsync({ 
          taskId, 
          data: { status: 'cancelled' as const } 
        });
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        title: 'Task Cancelled',
        text: 'The task has been moved to cancelled.',
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
      
      await Swal.fire({
        title: 'Status Updated',
        text: statusMessages[status] || 'Task status updated',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: 'Failed to update task status',
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

  const assignedTasksList = assignedTasks || [];
  const completedTasksList = isSearching ? (searchResults?.tasks || []) : (allTasksResponse?.tasks || []);

  const tabs = [
    { label: 'My Tasks', key: 'assigned' },
    { label: 'Team Feed', key: 'feed' },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Note: Liquid Glass Settings moved to Settings page */}

      {/* Header */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 3,
          background: isDarkMode 
            ? `linear-gradient(135deg, rgba(28, 28, 30, 0.8), rgba(44, 44, 46, 0.8))`
            : `linear-gradient(135deg, rgba(242, 242, 247, 0.8), rgba(255, 255, 255, 0.8))`,
          backdropFilter: `blur(${liquidGlassSettings.blurIntensity}px)`,
          WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity}px)`,
          border: liquidGlassSettings.addBorders ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography 
          variant="h3" 
          fontWeight="bold" 
          gutterBottom
          sx={{ color: getTextColor('primary') }}
        >
          Posts & Competition
        </Typography>
        <Chip 
          label={`${assignedTasksList.filter(t => t.status === 'done').length} Completed Tasks`}
          size="small"
          sx={{
            bgcolor: '#10b981',
            color: '#ffffff',
            fontWeight: 600,
            '& .MuiChip-label': {
              color: '#ffffff',
              fontWeight: 600,
            },
            '&:hover': {
              bgcolor: '#1b5e20',
            }
          }}
        />
      </Box>

      {/* Top Performers Section - Liquid Glass */}
      {topPerformers.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TrophyIcon 
              sx={{ 
                color: isDarkMode ? '#FFD700' : '#4a6cf7',
                fontSize: 28 
              }} 
            />
            <Typography 
              variant="h6" 
              fontWeight="bold"
              sx={{ color: getTextColor('primary') }}
            >
              Top Performers
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            {topPerformers.slice(0, 3).map((performer, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={performer.userId}>
                <Box
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderRadius: 2,
                    background: currentPreset.light,
                    backdropFilter: `blur(${liquidGlassSettings.blurIntensity}px)`,
                    WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity}px)`,
                    backgroundColor: isDarkMode 
                      ? `rgba(28, 28, 30, ${liquidGlassSettings.glassOpacity})` 
                      : `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity})`,
                    border: liquidGlassSettings.addBorders 
                      ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` 
                      : 'none',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    borderTop: index === 0 
                      ? '3px solid #FFD700' 
                      : index === 1 
                        ? '3px solid #C0C0C0' 
                        : index === 2 
                          ? '3px solid #CD7F32' 
                          : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.15)',
                    }
                  }}
                >
                  <Typography 
                    variant="h4" 
                    fontWeight="bold"
                    sx={{
                      background: index === 0 
                        ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                        : index === 1 
                          ? 'linear-gradient(135deg, #C0C0C0, #E8E8E8)'
                          : index === 2
                            ? 'linear-gradient(135deg, #CD7F32, #E4A07B)'
                            : getTextColor('secondary'),
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: index < 3 ? 'text' : getTextColor('secondary'),
                    }}
                  >
                    #{index + 1}
                  </Typography>
                  <Box flex={1} minWidth={0}>
                    <Typography 
                      variant="subtitle1" 
                      fontWeight="medium"
                      sx={{ 
                        color: getTextColor('primary'),
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {performer.userName} {performer.userLastName}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ color: getTextColor('secondary') }}
                    >
                      {performer.completedTasks} completed tasks
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Top Performers Loading State - Liquid Glass */}
      {!topPerformers.length && !topPerformersData && (
        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TrophyIcon sx={{ color: isDarkMode ? '#FFD700' : '#4a6cf7', fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: getTextColor('primary') }}>
              Top Performers
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {[1, 2, 3].map((index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderRadius: 2,
                    background: currentPreset.light,
                    backdropFilter: `blur(${liquidGlassSettings.blurIntensity}px)`,
                    WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity}px)`,
                    backgroundColor: isDarkMode 
                      ? `rgba(28, 28, 30, ${liquidGlassSettings.glassOpacity})` 
                      : `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity})`,
                    border: liquidGlassSettings.addBorders 
                      ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` 
                      : 'none',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <CircularProgress size={28} />
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="medium" sx={{ color: getTextColor('primary') }}>
                      Loading...
                    </Typography>
                    <Typography variant="body2" sx={{ color: getTextColor('secondary') }}>
                      Calculating scores...
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Current User's Rank - Liquid Glass */}
      {userRank && (
        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TrophyIcon 
              sx={{ 
                color: isDarkMode ? '#a64dff' : '#a64dff',
                fontSize: 28 
              }} 
            />
            <Typography 
              variant="h6" 
              fontWeight="bold"
              sx={{ color: getTextColor('primary') }}
            >
              Your Performance
            </Typography>
          </Box>
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
              background: currentPreset.light,
              backdropFilter: `blur(${liquidGlassSettings.blurIntensity}px)`,
              WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity}px)`,
              backgroundColor: isDarkMode 
                ? `rgba(28, 28, 30, ${liquidGlassSettings.glassOpacity})` 
                : `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity})`,
              border: liquidGlassSettings.addBorders 
                ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` 
                : 'none',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(166, 77, 255, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }
            }}
          >
            <Typography 
              variant="h3" 
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(135deg, #a64dff, #dc7bff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              #{userRank.rank}
            </Typography>
            <Typography 
              variant="h6" 
              mb={1}
              sx={{ color: getTextColor('primary') }}
            >
              {user?.userName} {user?.userLastName}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ color: getTextColor('secondary') }}
            >
              {userRank.completedTasks} completed tasks out of {userRank.totalUsers} competitors
            </Typography>
            {userRank.rank > 3 && (
              <Typography 
                variant="body2" 
                sx={{ 
                  mt: 2,
                  color: isDarkMode ? '#dc7bff' : '#a64dff',
                  fontWeight: 500,
                }}
              >
                🚀 Keep going! You're getting closer to the top!
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Liquid Glass Search Section */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            fullWidth
            placeholder="Search completed tasks by title or description..."
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
                backgroundColor: isDarkMode ? 'rgba(44, 44, 46, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: `blur(${liquidGlassSettings.blurIntensity / 2}px)`,
                WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity / 2}px)`,
                '& fieldset': {
                  border: 'none',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  border: liquidGlassSettings.addBorders
                    ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)'}`
                    : 'none',
                },
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
              background: currentPreset.light,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              opacity: !searchQuery.trim() || searchLoading ? 0.6 : 1,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
              },
            }}
          >
            {searchLoading ? 'Searching...' : 'Search'}
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
            Showing results for "{searchQuery}"
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
            backgroundColor: isDarkMode ? 'rgba(44, 44, 46, 0.8)' : 'rgba(230, 230, 235, 0.8)',
            backdropFilter: `blur(${liquidGlassSettings.blurIntensity / 2}px)`,
            WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity / 2}px)`,
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
                  borderRadius: 8,
                  minHeight: 36,
                  minWidth: 100,
                  textTransform: 'none',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  color: activeTab === index 
                    ? getTextColor('primary') 
                    : getTextColor('secondary'),
                  '&.Mui-selected': {
                    background: currentPreset.light,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
      {(tasksError || allTasksError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load tasks. Please try again.
        </Alert>
      )}

      {/* Task Lists */}
      <TabPanel value={activeTab} index={0}>
        {/* My Tasks Tab */}
        {tasksLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {assignedTasksList.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Box textAlign="center" py={4}>
                  <Typography variant="h6" color="text.secondary">
                    No tasks assigned to you yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Check back later for new assignments
                  </Typography>
                </Box>
              </Grid>
            ) : (
              assignedTasksList.map((task) => (
                <Grid size={{ xs: 12 }} key={task.taskId}>
                  <TaskFeedCard
                    task={task}
                    likeSummary={taskLikeSummaries[task.taskId]}
                    onEdit={handleEditTask}
                    onLike={handleLike}
                    onUnlike={handleUnlike}
                    onComment={handleComment}
                    onMarkDone={handleMarkTaskDone}
                    onMarkUndone={handleMarkTaskUndone}
                    onApproveTask={handleApproveTask}
                    onStartProgress={handleStartProgress}
                    onCancel={handleCancelTask}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                  />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Team Feed Tab */}
        {isSearching ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : allTasksLoading && !isSearching ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {completedTasksList.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Box textAlign="center" py={4}>
                  <Typography variant="h6" color="text.secondary">
                    {isSearching ? 'No tasks found matching your search' : 'No completed tasks yet'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isSearching ? 'Try different keywords or clear the search to see all tasks' : 'Be the first to complete a task and start the competition!'}
                  </Typography>
                </Box>
              </Grid>
            ) : (
              completedTasksList.map((task) => (
                <Grid size={{ xs: 12 }} key={task.taskId}>
                  <TaskFeedCard
                    task={task}
                    likeSummary={taskLikeSummaries[task.taskId]}
                    onEdit={handleEditTask}
                    onLike={handleLike}
                    onUnlike={handleUnlike}
                    onComment={handleComment}
                    onMarkDone={handleMarkTaskDone}
                    onMarkUndone={handleMarkTaskUndone}
                    onApproveTask={handleApproveTask}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                  />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </TabPanel>
      
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
            Task Completed! 🎉
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          {doneTaskData && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Great job! You completed "<strong>{doneTaskData.task.title}</strong>"
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'success.50', 
                borderRadius: 2, 
                border: 2, 
                borderColor: 'success.main' 
              }}>
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  Your New Rank: #{doneTaskData.newRank.rank}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {doneTaskData.newRank.completedTasks} completed tasks
                </Typography>
                {doneTaskData.newRank.rank <= 3 && (
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    🏆 You're in the Top 3! Amazing work!
                  </Typography>
                )}
                {doneTaskData.newRank.rank > 3 && (
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    🚀 Keep climbing! You're doing great!
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
            Awesome!
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
          <Typography sx={{ fontSize: 48, mb: 1 }}>💪</Typography>
          <Typography variant="h6" color="warning.main" fontWeight="bold" component="div">
            Task Reopened! 🔄
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          {undoneTaskData && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                No worries! "<strong>{undoneTaskData.task.title}</strong>" has been reopened for improvement.
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'warning.50', 
                borderRadius: 2, 
                border: 2, 
                borderColor: 'warning.main' 
              }}>
                <Typography variant="h6" color="warning.main" fontWeight="bold">
                  Your Current Rank: #{undoneTaskData.newRank.rank}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {undoneTaskData.newRank.completedTasks} completed tasks
                </Typography>
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  💡 Take your time and do your best. You've got this!
                </Typography>
                {undoneTaskData.newRank.rank <= 3 && (
                  <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    🎯 Still in the Top 3! Keep up the great work!
                  </Typography>
                )}
                {undoneTaskData.newRank.rank > 3 && (
                  <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    🚀 Every setback is a setup for a comeback!
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
            Got it!
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
        onSave={async (taskData: any) => {
          try {
            // Handle date conversion for backend
            const dataToSave = {
              ...taskData,
              // Handle date range - convert Date objects to ISO strings
              startDate: taskData.dueDateRange?.[0] ? taskData.dueDateRange[0].toISOString() : taskData.startDate || null,
              endDate: taskData.dueDateRange?.[1] ? taskData.dueDateRange[1].toISOString() : taskData.endDate || null,
              // Keep dueDate for backward compatibility (single date)
              dueDate: (!taskData.dueDateRange?.[0] && !taskData.startDate) ?
                (taskData.dueDate instanceof Date ? taskData.dueDate.toISOString() : taskData.dueDate) : null
            };

            if (editingTask) {
              await updateTaskMutation.mutateAsync({
                taskId: editingTask.taskId,
                data: dataToSave as UpdateTaskData
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
