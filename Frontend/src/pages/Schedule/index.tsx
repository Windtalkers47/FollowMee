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
import { useAppSelector } from '../../store/store';
import Swal from 'sweetalert2';
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
  const theme = useTheme();
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
    const result = await Swal.fire({
      title: 'Approve Task',
      text: 'Are you sure you want to approve this task?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
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
      text: 'Are you sure you want to reject this task?',
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
      text: 'Are you sure you want to reopen this completed task?',
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
        title: 'Task Reopened!',
        text: 'The task has been reopened for improvement.',
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleCancelTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Cancel Task?',
      text: 'Are you sure you want to cancel this task?',
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
      
      const statusMessages: Record<string, string> = {
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

  const handleStartProgress = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Start Working?',
      text: 'Ready to start working on this task?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Let\'s go!',
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
        title: 'Let\'s Get Started!',
        text: 'You\'re now working on this task.',
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

  const groupedTasks = {
    all: filteredTasks,
    draft: filteredTasks.filter(task => task.status === 'draft'),
    todo: filteredTasks.filter(task => task.status === 'todo'),
    in_progress: filteredTasks.filter(task => task.status === 'in_progress'),
    review: filteredTasks.filter(task => task.status === 'review'),
    done: filteredTasks.filter(task => task.status === 'done'),
    cancelled: filteredTasks.filter(task => task.status === 'cancelled'),
  };

  // Load like summaries
  React.useEffect(() => {
    filteredTasks?.forEach(task => {
      if (!taskLikeSummaries[task.taskId]) {
        fetchLikeSummary(task.taskId);
      }
    });
  }, [filteredTasks, taskLikeSummaries]);

  const tabs = [
    { label: 'All Tasks', key: 'all' as const, color: '#757575' },
    { label: 'Drafts', key: 'draft' as const, color: '#9e9e9e' },
    { label: 'To Do', key: 'todo' as const, color: '#2196f3' },
    { label: 'In Progress', key: 'in_progress' as const, color: '#ff9800' },
    { label: 'Review', key: 'review' as const, color: '#9c27b0' },
    { label: 'Done', key: 'done' as const, color: '#4caf50' },
    { label: 'Cancelled', key: 'cancelled' as const, color: '#f44336' },
  ];

  // Handle bulk actions from toolbar
  const handleBulkAction = async (action: 'delete' | 'done' | 'start' | 'todo' | 'draft' | 'review' | 'cancel' | 'assign') => {
    const selectedTaskIds = Array.from(multiSelect.selectedIds);
    
    if (selectedTaskIds.length === 0) {
      toast.warning('No tasks selected');
      return;
    }

    switch (action) {
      case 'delete':
        const deleteResult = await Swal.fire({
          title: `Delete ${selectedTaskIds.length} tasks?`,
          text: 'This action cannot be undone.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#FF3B30',
          cancelButtonColor: '#757575',
          confirmButtonText: 'Yes, delete all!',
          cancelButtonText: 'Cancel',
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
        toast.info('Assign feature coming soon');
        break;
    }
  };

  // Get current tab tasks for select all - convert to { id: string } format
  const currentTabTasks = (groupedTasks[tabs[activeTab].key] || []).map(task => ({ id: task.taskId }));

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
            Tasks & Schedule
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
                Select
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
              Create Task
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
            placeholder="Search..."
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
            <Tooltip title="Search">
              <IconButton onClick={handleSearch} sx={{ p: 1.25, borderRadius: 2 }}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ width: 1, height: 24, borderLeft: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}` }} />
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()} disabled={isLoading} sx={{ p: 1.25, borderRadius: 2 }}>
              <RefreshIcon sx={{ fontSize: 22, animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '180px 200px' }, gap: 1.5, mt: 1.5, justifyContent: 'end' }}>
          <FormControl size="small">
            <InputLabel>Due date</InputLabel>
            <Select label="Due date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}>
              <MenuItem value="all">Any date</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="today">Due today</MenuItem>
              <MenuItem value="week">Next 7 days</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Sort</InputLabel>
            <Select label="Sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <MenuItem value="updated_desc">Recently updated</MenuItem>
              <MenuItem value="due_asc">Due date</MenuItem>
              <MenuItem value="title_asc">Title A–Z</MenuItem>
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
