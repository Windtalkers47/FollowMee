import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useAppSelector } from '../../store/store';
import Swal from 'sweetalert2';
import { taskApi, Task, CreateTaskData, UpdateTaskData, TaskLikeSummary } from '../../api/task.api';
import { userApi } from '../../api/user.api';
import { likeApi } from '../../api/task.api';
import { ScheduleTaskCard } from '../../components/ScheduleTaskCard';
import { TaskForm } from '../../components/TaskForm/TaskForm';

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

      {/* Task Form Dialog - Remove this since we're using TaskForm component */}

/* ================== Page ================== */
const SchedulePage = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [taskLikeSummaries, setTaskLikeSummaries] = useState<Record<string, TaskLikeSummary>>({});

  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Theme-aware colors
  const isDarkMode = theme.palette.mode === 'dark';
  const glassBgColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.08)' 
    : 'rgba(255, 255, 255, 0.7)';
  const glassBorderColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.15)' 
    : 'rgba(0, 0, 0, 0.1)';
  const defaultTextColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.9)' 
    : 'rgba(0, 0, 0, 0.8)';
  const mutedTextColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.7)' 
    : 'rgba(0, 0, 0, 0.6)';

  // Fetch tasks
  const { data: tasksResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', { search: searchQuery, status: statusFilter }],
    queryFn: () => taskApi.getTasks({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  // Fetch users for assignment dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  });

  // Extract dates only for current task being edited
  const getBookedDates = (): Date[] => {
    const dates: Date[] = [];
    
    // Only include dates from current editing task
    // For new tasks (editingTask is undefined), return empty array
    if (editingTask) {
      if (editingTask.startDate && editingTask.endDate) {
        const start = parseISO(editingTask.startDate);
        const end = parseISO(editingTask.endDate);
        const current = new Date(start);
        while (current <= end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      } else if (editingTask.dueDate) {
        dates.push(parseISO(editingTask.dueDate));
      }
    }
    // For new tasks, calendar will be empty (no green highlighting)
    
    return dates;
  };
  
  const bookedDates = getBookedDates();

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => taskApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) =>
      taskApi.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

  // Note: Using updateTaskMutation for status changes since specific endpoints don't exist yet

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
    // Comment functionality would be handled here
    console.log('Comment on task:', taskId, comment);
  };

  const handleMarkDone = (taskId: string) => {
    markTaskDoneMutation.mutate({ taskId });
  };

  const handleMarkUndone = (taskId: string) => {
    markTaskUndoneMutation.mutate(taskId);
  };

  const handleApproveTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Approve Task',
      text: 'Are you sure you want to approve this task? This will mark it as completed.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      // confirmButtonColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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

  const handleRejectTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Reject Task',
      text: 'Are you sure you want to reject this task? This will send it back to the assignee.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f44336',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Yes, reject it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        Swal.showLoading();
        return markTaskUndoneMutation.mutateAsync(taskId);
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        title: 'Rejected!',
        text: 'Task has been rejected and sent back.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleUndoTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Reopen Task?',
      text: 'Are you sure you want to reopen this completed task? This will move it back to progress.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Yes, reopen it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: () => {
        Swal.showLoading();
        return markTaskUndoneMutation.mutateAsync(taskId);
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        title: 'Task Reopened! ',
        html: `
          <div style="text-align: center;">
            <p>No worries! The task has been reopened for improvement.</p>
            <div style="margin: 20px 0; padding: 16px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
              <h4 style="margin: 0 0 8px 0; color: #f57c00;">💡 Take your time and do your best!</h4>
              <p style="margin: 0; color: #666;">You've got this! Every setback is a setup for a comeback!</p>
            </div>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'Got it!',
        confirmButtonColor: '#ff9800',
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
        timer: 3000,
        showConfirmButton: true
      });
    }
  };

  // Fetch like summaries for tasks
  const fetchLikeSummary = async (taskId: string) => {
    try {
      const summary = await likeApi.getTaskLikeSummary(taskId);
      setTaskLikeSummaries(prev => ({ ...prev, [taskId]: summary }));
    } catch (error) {
      console.error('Error fetching like summary:', error);
    }
  };

  const filteredTasks = tasksResponse?.tasks || [];

  const groupedTasks = {
    all: filteredTasks,
    draft: filteredTasks.filter(task => task.status === 'draft'),
    todo: filteredTasks.filter(task => task.status === 'todo'),
    in_progress: filteredTasks.filter(task => task.status === 'in_progress'),
    review: filteredTasks.filter(task => task.status === 'review'),
    done: filteredTasks.filter(task => task.status === 'done'),
    cancelled: filteredTasks.filter(task => task.status === 'cancelled'),
  };

  // Load like summaries for visible tasks
  useEffect(() => {
    filteredTasks?.forEach(task => {
      if (!taskLikeSummaries[task.taskId]) {
        fetchLikeSummary(task.taskId);
      }
    });
  }, [filteredTasks, taskLikeSummaries]);

  const tabs = [
    { 
      label: 'All Tasks', 
      key: 'all' as const,
      color: '#757575' // Gray for all
    },
    { 
      label: 'Drafts', 
      key: 'draft' as const,
      color: '#9e9e9e' // Gray for draft
    },
    { 
      label: 'To Do', 
      key: 'todo' as const,
      color: '#2196f3' // Blue for todo
    },
    { 
      label: 'In Progress', 
      key: 'in_progress' as const,
      color: '#ff9800' // Orange for in progress
    },
    { 
      label: 'Review', 
      key: 'review' as const,
      color: '#9c27b0' // Purple for review
    },
    { 
      label: 'Done', 
      key: 'done' as const,
      color: '#4caf50' // Green for done
    },
    { 
      label: 'Cancelled', 
      key: 'cancelled' as const,
      color: '#f44336' // Red for cancelled
    },
  ];

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: '100vw',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}
      >
        <Typography 
          variant="h4" 
          fontWeight="bold"
          sx={{
            fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem' }
          }}
        >
          Task Management
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setTaskDialogOpen(true)}
          sx={{
            px: { xs: 3, sm: 4 },
            py: { xs: 1.5, sm: 2 }
          }}
        >
          Create Task
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box 
        sx={{ 
          mb: 3,
          px: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid size={{ xs: 12, md: 6, lg: 7 }}>
            <TextField
              fullWidth
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                label="Status Filter"
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="todo">To Do</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="review">Review</MenuItem>
                <MenuItem value="done">Done</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2.5 }}>
            <Button
              fullWidth
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={isLoading}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 1.5, sm: 2 }
              }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Status Tabs */}
      <Box 
        sx={{ 
          mb: 3,
          px: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <Box 
          sx={{
            display: 'flex',
            gap: 1,
            p: 1.5,
            background: glassBgColor,
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: `1px solid ${glassBorderColor}`,
            flexWrap: 'wrap',
            overflowX: 'auto'
          }}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === index;
            const taskCount = groupedTasks[tab.key].length;
            
            return (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(index)}
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
                  fontWeight: isActive ? 700 : 500,
                  background: isActive 
                    ? `${tab.color}CC` // Semi-transparent color when active
                    : `${tab.color}15`, // Very transparent when inactive
                  color: isActive 
                    ? 'white' 
                    : defaultTextColor,
                  border: `2px solid ${isActive ? tab.color : `${tab.color}40`}`,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  minWidth: 'fit-content',
                  textTransform: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: isActive 
                      ? `${tab.color}E6` // More opaque on hover
                      : `${tab.color}25`, // Slightly more opaque on hover
                    borderColor: tab.color,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 20px ${tab.color}40`,
                    color: isActive 
                      ? 'white' 
                      : tab.color,
                  },
                  '&:active': {
                    transform: 'translateY(0)'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), transparent)',
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 0.2s ease'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                  <Typography variant="inherit" sx={{ lineHeight: 1 }}>
                    {tab.label}
                  </Typography>
                  <Box 
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      background: isActive 
                        ? 'rgba(255, 255, 255, 0.3)' 
                        : `${tab.color}30`,
                      color: isActive 
                        ? 'white' 
                        : tab.color,
                      fontWeight: 700,
                      minWidth: '24px',
                      textAlign: 'center'
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
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            mx: { xs: 2, sm: 3, md: 4 }
          }}
        >
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
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No {tab.label.toLowerCase()} found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tab.key === 'all' && 'Try adjusting filters or create a new task'}
                    {tab.key === 'draft' && 'Drafts are tasks you\'re still working on'}
                    {tab.key === 'todo' && 'Tasks ready to be started'}
                    {tab.key === 'in_progress' && 'Tasks currently being worked on'}
                    {tab.key === 'review' && 'Tasks waiting for approval'}
                    {tab.key === 'done' && 'Completed tasks - great work!'}
                    {tab.key === 'cancelled' && 'Cancelled tasks'}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
                  <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
                    {groupedTasks[tab.key].map((task) => (
                      <Grid 
                        size={{ 
                          xs: 12,      // Mobile: full width
                          sm: 6,       // Tablet: 2 columns
                          md: 4,       // Desktop: 3 columns
                          lg: 3,       // Large: 4 columns
                          xl: 2.4      // Extra large: 5 columns
                        }} 
                        key={task.taskId}
                      >
                        <ScheduleTaskCard
                          task={task}
                          likeSummary={taskLikeSummaries[task.taskId]}
                          currentUserId={user?.userId || 0}
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
                          showActions={true}
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

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16,
          background: 'linear-gradient(135deg, rgba(74, 108, 247, 0.8), rgba(166, 77, 255, 0.8))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 25px rgba(74, 108, 247, 0.4)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'float 3s ease-in-out infinite',
          '&:hover': {
            transform: 'scale(1.1) translateY(-2px)',
            boxShadow: '0 12px 35px rgba(74, 108, 247, 0.6)',
          }
        }}
        onClick={() => setTaskDialogOpen(true)}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default SchedulePage;
