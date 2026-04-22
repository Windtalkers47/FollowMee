import { useState, useEffect } from 'react';
import React from 'react';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  EmojiEvents as TrophyIcon,
  ThumbUp as LikeIcon,
  Favorite as LoveIcon,
  SentimentVerySatisfied as LaughIcon,
  ThumbDown as AngryIcon,
  CheckCircle as DoneIcon,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../../store/store';
import { taskApi, likeApi, commentApi, Task, TaskLikeSummary, UserRank, UpdateTaskData } from '../../api/task.api';
import TaskCard from '../../components/TaskCard';
import Swal from 'sweetalert2';
import { getTaskPermissions, hasAnyPermission } from '../../permissions/taskPermissions';

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

  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Fetch assigned tasks
  const { data: assignedTasks, isLoading: tasksLoading, error: tasksError, refetch: refetchTasks } = useQuery({
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

  // Mark task as done mutation (now actually submits for review)
  const markTaskDoneMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data?: { completionNote?: string } }) =>
      taskApi.markTaskAsDone(taskId, data),
    onSuccess: (response) => {
      // Show submit for review dialog instead of completion dialog
      Swal.fire({
        icon: 'success',
        title: 'Task Submitted for Review! ',
        text: `"${response.task.title}" has been submitted for review. The task creator will review and approve it.`,
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Got it!'
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['top-performers'] });
      queryClient.invalidateQueries({ queryKey: ['user-rank'] });
    },
  });

  // Mark task as undone mutation
  const markTaskUndoneMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.markTaskAsUndone(taskId),
    onSuccess: (response) => {
      // Show undone dialog
      setUndoneTaskData({ task: response.task, newRank: response.userRank });
      setUndoneDialogOpen(true);
      
      // Invalidate queries to refresh data
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
      // Invalidate queries to refresh data
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
    // Show confirmation dialog for undo/reject
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
    // Show const handleApproveTask = async (taskId: string) => {
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
      preConfirm: () => {
        return markTaskDoneMutation.mutateAsync({ taskId });
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

  const assignedTasksList = assignedTasks || [];
  const completedTasksList = isSearching ? (searchResults?.tasks || []) : (allTasksResponse?.tasks || []);

  const tabs = [
    { label: 'My Tasks', key: 'assigned' },
    { label: 'Team Feed', key: 'feed' },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Clean Header */}
      <Box mb={4}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Posts & Competition
        </Typography>
        <Chip 
          label={`${assignedTasksList.filter(t => t.status === 'done').length} Completed Tasks`}
          color="success"
          size="small"
        />
      </Box>

      {/* Top Performers Section */}
      {topPerformers.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TrophyIcon color="primary" />
            <Typography variant="h6">Top Performers</Typography>
          </Box>
          
          <Grid container spacing={2}>
            {topPerformers.slice(0, 3).map((performer, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={performer.userId}>
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: index === 0 ? 'primary.50' : 'background.paper',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 2
                    }
                  }}
                >
                  <Typography 
                    variant="h4" 
                    color={index === 0 ? 'primary.main' : 'text.secondary'}
                    fontWeight="bold"
                  >
                    #{index + 1}
                  </Typography>
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {performer.userName} {performer.userLastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {performer.completedTasks} completed tasks
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!topPerformers.length && !topPerformersData && (
        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TrophyIcon color="primary" />
            <Typography variant="h6">Top Performers</Typography>
          </Box>
          <Grid container spacing={2}>
            {[1, 2, 3].map((index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <CircularProgress size={32} />
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Loading...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Calculating scores...
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Current User's Rank */}
      {userRank && (
        <Box sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TrophyIcon color="secondary" />
            <Typography variant="h6">Your Performance</Typography>
          </Box>
          <Box
            sx={{
              p: 3,
              border: 2,
              borderColor: 'secondary.main',
              borderRadius: 2,
              bgcolor: 'secondary.50',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" color="secondary.main" fontWeight="bold">
              #{userRank.rank}
            </Typography>
            <Typography variant="h6" color="text.secondary" mb={1}>
              {user?.userName} {user?.userLastName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {userRank.completedTasks} completed tasks out of {userRank.totalUsers} competitors
            </Typography>
            {userRank.rank > 3 && (
              <Typography variant="body2" color="secondary.main" sx={{ mt: 1 }}>
                Keep going! You're getting closer to the top!
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Clean Search Section */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            fullWidth
            placeholder="Search completed tasks by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
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
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
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
              textTransform: 'none'
            }}
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </Button>
        </Box>
        {isSearching && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing results for "{searchQuery}"
          </Typography>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          {tabs.map((tab, index) => (
            <Tab
              key={tab.key}
              label={tab.label}
              {...{ id: `posts-tab-${index}`, 'aria-controls': `posts-tabpanel-${index}` }}
            />
          ))}
        </Tabs>
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
    </Box>
  );
};

export default PostsPage;
