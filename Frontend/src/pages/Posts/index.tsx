import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  EmojiEvents as TrophyIcon,
  ThumbUp as LikeIcon,
  Favorite as LoveIcon,
  SentimentVerySatisfied as LaughIcon,
  ThumbDown as AngryIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../../store/store';
import { taskApi, likeApi, commentApi, Task, TaskLikeSummary } from '../../api/task.api';
import TaskCard from '../../components/TaskCard';

/* ================== Types ================== */
type TabPanelProps = {
  children: React.ReactNode;
  index: number;
  value: number;
};

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
  onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry') => void;
  onUnlike?: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
}

const TaskFeedCard: React.FC<TaskFeedCardProps> = ({
  task,
  likeSummary,
  onLike,
  onUnlike,
  onComment,
}) => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <TaskCard
      task={task}
      likeSummary={likeSummary}
      currentUserId={user?.userId || 0}
      onLike={onLike}
      onUnlike={onUnlike}
      onComment={onComment}
      showActions={false} // Hide edit/delete actions in feed
      compact={false}
    />
  );
};

/* ================== Leaderboard Component ================== */
interface LeaderboardEntry {
  userId: number;
  userName: string;
  userLastName: string;
  totalLikes: number;
  totalComments: number;
  totalTasks: number;
  score: number;
}

const Leaderboard: React.FC<{ entries: LeaderboardEntry[] }> = ({ entries }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <TrophyIcon color="primary" />
        <Typography variant="h6">Staff Competition Leaderboard</Typography>
      </Box>

      <Grid container spacing={2}>
        {entries.slice(0, 5).map((entry, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={entry.userId}>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: index === 0 ? 'primary.light' : 'background.paper',
              }}
            >
              <Typography variant="h4" color={index === 0 ? 'primary.contrastText' : 'primary'}>
                #{index + 1}
              </Typography>
              <Box>
                <Typography variant="subtitle1" fontWeight="medium">
                  {entry.userName} {entry.userLastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {entry.totalTasks} tasks • {entry.totalLikes} likes • {entry.score} points
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

/* ================== Page ================== */
const PostsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskLikeSummaries, setTaskLikeSummaries] = useState<Record<string, TaskLikeSummary>>({});

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
    queryFn: () => taskApi.getTasks({ status: 'done' }),
  });

  // Mutations
  const likeMutation = useMutation({
    mutationFn: ({ taskId, likeType }: { taskId: string; likeType: 'like' | 'love' | 'laugh' | 'angry' }) =>
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

  // Fetch like summaries for tasks
  const fetchLikeSummary = async (taskId: string) => {
    try {
      const summary = await likeApi.getTaskLikeSummary(taskId);
      setTaskLikeSummaries(prev => ({ ...prev, [taskId]: summary }));
    } catch (error) {
      console.error('Error fetching like summary:', error);
    }
  };

  // Load like summaries for visible tasks
  useEffect(() => {
    const tasks = activeTab === 0 ? assignedTasks : allTasksResponse?.tasks;
    tasks?.forEach(task => {
      if (!taskLikeSummaries[task.taskId]) {
        fetchLikeSummary(task.taskId);
      }
    });
  }, [assignedTasks, allTasksResponse, activeTab, taskLikeSummaries]);

  const handleLike = async (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry') => {
    await likeMutation.mutateAsync({ taskId, likeType });
  };

  const handleUnlike = async (taskId: string) => {
    await unlikeMutation.mutateAsync(taskId);
  };

  const handleComment = async (taskId: string, comment: string) => {
    await commentMutation.mutateAsync({ taskId, data: { comment } });
  };

  const assignedTasksList = assignedTasks || [];
  const completedTasksList = allTasksResponse?.tasks || [];

  // Mock leaderboard data - In real implementation, this would come from an API
  const leaderboardData: LeaderboardEntry[] = [
    { userId: 1, userName: 'John', userLastName: 'Doe', totalLikes: 45, totalComments: 12, totalTasks: 8, score: 156 },
    { userId: 2, userName: 'Jane', userLastName: 'Smith', totalLikes: 38, totalComments: 15, totalTasks: 7, score: 143 },
    { userId: 3, userName: 'Bob', userLastName: 'Johnson', totalLikes: 32, totalComments: 8, totalTasks: 6, score: 128 },
  ];

  const tabs = [
    { label: 'My Tasks', key: 'assigned' },
    { label: 'Team Feed', key: 'feed' },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Posts & Competition
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Complete tasks and compete with your team through likes and comments
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Chip
            icon={<LikeIcon />}
            label={`${assignedTasksList.filter(t => t.status === 'done').length} Completed`}
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<TrophyIcon />}
            label="Top Performer"
            color="primary"
            variant="filled"
          />
        </Box>
      </Box>

      {/* Leaderboard */}
      {activeTab === 1 && <Leaderboard entries={leaderboardData} />}

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
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
          <Grid size={{ xs: 12, md: 4 }}>
            <Button
              fullWidth
              startIcon={<RefreshIcon />}
              onClick={() => {
                refetchTasks();
                refetchAllTasks();
              }}
              disabled={tasksLoading || allTasksLoading}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
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
                  />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Team Feed Tab */}
        {allTasksLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {completedTasksList.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Box textAlign="center" py={4}>
                  <Typography variant="h6" color="text.secondary">
                    No completed tasks yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Be the first to complete a task and start the competition!
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
                  />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </TabPanel>
    </Box>
  );
};

export default PostsPage;
