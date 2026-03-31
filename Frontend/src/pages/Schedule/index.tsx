import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Tabs,
  Tab,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Fab,
  Snackbar
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useAppSelector } from '../../store/store';
import { taskApi, Task, CreateTaskData, UpdateTaskData } from '../../api/task.api';
import { userApi, User } from '../../api/user.api';
import TaskCard from '../../components/TaskCard';
import { TaskForm } from '../../components/TaskForm/TaskForm';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

/* ================== Types ================== */
type TabPanelProps = {
  children: React.ReactNode;
  index: number;
  value: number;
};

type TaskStatus = 'draft' | 'upcoming' | 'past' | 'done';

/* ================== TabPanel ================== */
const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

/* ================== Task Form Dialog ================== */
interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  onSubmit: (data: CreateTaskData | UpdateTaskData) => Promise<void>;
  users: User[];
  usersLoading: boolean;
}

const TaskFormDialog: React.FC<TaskFormDialogProps> = ({ open, onClose, task, onSubmit, users, usersLoading }) => {
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    assignedTo: undefined,
    dueDate: undefined,
    status: 'draft',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        assignedTo: task.assignedTo,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        status: task.status,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        assignedTo: undefined,
        dueDate: undefined,
        status: 'draft',
      });
    }
  }, [task]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      const submitData = task ? formData : {
        ...formData,
        dueDate: formData.dueDate instanceof Date ? formData.dueDate.toISOString() : formData.dueDate
      };
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            fullWidth
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={formData.assignedTo || ''}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value ? Number(e.target.value) : undefined })}
              label="Assign To"
              disabled={usersLoading}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.userId} value={user.userId}>
                  {user.userName} {user.userLastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Due Date"
              value={formData.dueDate ? new Date(formData.dueDate) : null}
              onChange={(date) => setFormData({ ...formData, dueDate: date || undefined })}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>

          <TextField
            label="Image URL"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            fullWidth
          />

          {!task && (
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                label="Status"
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="upcoming">Upcoming</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title.trim()}
        >
          {loading ? <CircularProgress size={20} /> : (task ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ================== Page ================== */
const SchedulePage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasksResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', { search: searchQuery, status: statusFilter }],
    queryFn: () => taskApi.getTasks({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  // Fetch users for assignment dropdown
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  });

  // Extract booked dates from existing tasks
  const getBookedDates = (): Date[] => {
    if (!tasksResponse?.tasks) return [];
    
    const dates: Date[] = [];
    tasksResponse.tasks.forEach((task: Task) => {
      // Handle date ranges
      if (task.startDate && task.endDate) {
        const start = parseISO(task.startDate);
        const end = parseISO(task.endDate);
        const current = new Date(start);
        while (current <= end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      }
      // Handle single due dates
      else if (task.dueDate) {
        dates.push(parseISO(task.dueDate));
      }
      // Fallback to createdAt for booking indication
      else if (task.createdAt) {
        dates.push(parseISO(task.createdAt));
      }
    });
    
    // Also include dates from the current editing task
    if (editingTask) {
      if (editingTask.startDate && editingTask.endDate) {
        dates.push(parseISO(editingTask.startDate));
        dates.push(parseISO(editingTask.endDate));
      } else if (editingTask.dueDate) {
        dates.push(parseISO(editingTask.dueDate));
      }
    }
    
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

  const handleCreateTask = async (data: CreateTaskData | UpdateTaskData) => {
    await createTaskMutation.mutateAsync(data as CreateTaskData);
  };

  const handleUpdateTask = async (data: CreateTaskData | UpdateTaskData) => {
    if (editingTask) {
      await updateTaskMutation.mutateAsync({ taskId: editingTask.taskId, data: data as UpdateTaskData });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTaskMutation.mutateAsync(taskId);
  };

  const handleStatusUpdate = async (taskId: string, status: TaskStatus) => {
    await updateTaskMutation.mutateAsync({ taskId, data: { status } });
  };

  const filteredTasks = tasksResponse?.tasks || [];

  const groupedTasks = {
    all: filteredTasks,
    draft: filteredTasks.filter(task => task.status === 'draft'),
    upcoming: filteredTasks.filter(task => task.status === 'upcoming'),
    past: filteredTasks.filter(task => task.status === 'past'),
    done: filteredTasks.filter(task => task.status === 'done'),
  };

  const tabs = [
    { label: 'All Tasks', key: 'all' as const },
    { label: 'Drafts', key: 'draft' as const },
    { label: 'Upcoming', key: 'upcoming' as const },
    { label: 'Past Due', key: 'past' as const },
    { label: 'Done', key: 'done' as const },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Task Management
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setTaskDialogOpen(true)}
        >
          Create Task
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                label="Status Filter"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="upcoming">Upcoming</MenuItem>
                <MenuItem value="past">Past Due</MenuItem>
                <MenuItem value="done">Done</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Button
              fullWidth
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Status Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          {tabs.map((tab, index) => (
            <Tab
              key={tab.key}
              label={`${tab.label} (${groupedTasks[tab.key].length})`}
              {...{ id: `task-tab-${index}`, 'aria-controls': `task-tabpanel-${index}` }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
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
            <Grid container spacing={2}>
              {groupedTasks[tab.key].length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Box textAlign="center" py={4}>
                    <Typography variant="h6" color="text.secondary">
                      No {tab.label.toLowerCase()} found
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                groupedTasks[tab.key].map((task) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={task.taskId}>
                    <TaskCard
                      task={task}
                      currentUserId={user?.userId || 0}
                      onEdit={(task) => {
                        setEditingTask(task);
                        setTaskDialogOpen(true);
                      }}
                      onDelete={handleDeleteTask}
                      showActions={true}
                    />
                  </Grid>
                ))
              )}
            </Grid>
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
              // Handle date range
              startDate: taskData.dueDateRange?.[0] || taskData.startDate || null,
              endDate: taskData.dueDateRange?.[1] || taskData.endDate || null,
              // Keep dueDate for backward compatibility (single date)
              dueDate: (!taskData.dueDateRange?.[0] && !taskData.startDate) ? taskData.dueDate : null
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
