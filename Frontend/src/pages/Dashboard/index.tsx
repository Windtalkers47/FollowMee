import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  People as PeopleIcon,
  Task as TaskIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as EmojiEventsIcon,
  Add as AddIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAppSelector } from '../../store/store';
import {
  LiquidGlassCard,
  StatCard,
  LeaderboardCard,
  PendingTasksList,
} from '../../components/LiquidGlassDashboard';
import {
  getDashboardStats,
  getLeaderboard,
  getPendingTasks,
  DashboardStats,
  LeaderboardData,
  PendingTask,
} from '../../services/api/dashboardApi';
import { gradientPresets } from '../../styles/liquidGlassStyles';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

type TimeRange = '7d' | '1m' | '3m' | '6m' | '1y';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  
  const gradientPreset = 'freshGreen' as const;
  const isDarkMode = false;

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [stats, leaderboardData, tasks] = await Promise.all([
          getDashboardStats(timeRange),
          getLeaderboard(5),
          getPendingTasks(5),
        ]);
        
        setDashboardStats(stats);
        setLeaderboard(leaderboardData);
        setPendingTasks(tasks.tasks);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange]);

  const handleTaskClick = (taskId: string) => {
    navigate(`/posts/${taskId}`);
  };

  const handleCreateTask = () => {
    navigate('/schedule');
  };

  const handleViewCustomers = () => {
    navigate('/customer');
  };

  const handleTimeRangeChange = (event: React.MouseEvent<HTMLElement>, newRange: TimeRange) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  // Prepare chart data
  const customerTrendData = dashboardStats?.customerStats.customerTrend
    ? {
        labels: dashboardStats.customerStats.customerTrend.map((item) => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
          {
            label: 'Active',
            data: dashboardStats.customerStats.customerTrend.map((item) => item.active),
            fill: true,
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            borderColor: '#4CAF50',
            tension: 0.4,
          },
          {
            label: 'New',
            data: dashboardStats.customerStats.customerTrend.map((item) => item.new),
            fill: true,
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            borderColor: '#2196F3',
            tension: 0.4,
          },
        ],
      }
    : null;

  const taskStatusData = dashboardStats?.taskStats.tasksByStatus
    ? {
        labels: ['To Do', 'In Progress', 'Review', 'Done', 'Cancelled'],
        datasets: [
          {
            data: [
              dashboardStats.taskStats.tasksByStatus.todo,
              dashboardStats.taskStats.tasksByStatus.in_progress,
              dashboardStats.taskStats.tasksByStatus.review,
              dashboardStats.taskStats.tasksByStatus.done,
              dashboardStats.taskStats.tasksByStatus.cancelled,
            ],
            backgroundColor: ['#FFC107', '#2196F3', '#9C27B0', '#4CAF50', '#F44336'],
            borderWidth: 0,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          font: {
            size: 11,
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          font: {
            size: 10,
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const getChartTitle = () => {
    const titles: Record<TimeRange, string> = {
      '7d': 'Customer Growth (7 Days)',
      '1m': 'Customer Growth (1 Month)',
      '3m': 'Customer Growth (3 Months)',
      '6m': 'Customer Growth (6 Months)',
      '1y': 'Customer Growth (1 Year)',
    };
    return titles[timeRange];
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: gradientPresets.freshGreen.light,
        }}
      >
        <CircularProgress sx={{ color: '#10b981' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, minHeight: '100vh' }}>
      {/* Fade-in animation */}
      <Box
        sx={{
          animation: 'fadeIn 0.6s ease-out',
          '@keyframes fadeIn': {
            '0%': { opacity: 0, transform: 'translateY(20px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        {/* Header - Welcome only */}
        <Box mb={4}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            gutterBottom
            sx={{
              color: isDarkMode ? '#fff' : '#1a1a1a',
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Welcome back, {user?.userName || 'User'}! 👋
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
            }}
          >
            Here's what's happening with your business today
          </Typography>
        </Box>

        {/* Quick Actions */}
        <Box display="flex" gap={2} mb={4} flexWrap="wrap">
          <LiquidGlassCard
            gradientPreset={gradientPreset}
            isDarkMode={isDarkMode}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-3px)',
              },
            }}
            onClick={handleCreateTask}
          >
            <Avatar sx={{ bgcolor: '#10b981', width: 44, height: 44 }}>
              <AddIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Create Task
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Add new task
              </Typography>
            </Box>
          </LiquidGlassCard>

          <LiquidGlassCard
            gradientPreset={gradientPreset}
            isDarkMode={isDarkMode}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-3px)',
              },
            }}
            onClick={handleViewCustomers}
          >
            <Avatar sx={{ bgcolor: '#2196F3', width: 44, height: 44 }}>
              <ListIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                View Customers
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Manage customers
              </Typography>
            </Box>
          </LiquidGlassCard>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Total Customers"
                value={dashboardStats?.customerStats.totalCustomers.toLocaleString() || '0'}
                icon={<PeopleIcon />}
                color="#10b981"
                trend={{
                  value: `+${dashboardStats?.customerStats.customersByStatus.newThisWeek || 0} this period`,
                  isPositive: true,
                }}
                subtitle={`${dashboardStats?.customerStats.customersByStatus.active.toLocaleString() || '0'} active`}
                gradientPreset={gradientPreset}
                isDarkMode={isDarkMode}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Pending Tasks"
                value={dashboardStats?.taskStats.pendingTasks.toLocaleString() || '0'}
                icon={<TaskIcon />}
                color="#f59e0b"
                trend={{
                  value: `${dashboardStats?.taskStats.completionRate || 0}% completion rate`,
                  isPositive: true,
                }}
                subtitle="Need attention"
                gradientPreset={gradientPreset}
                isDarkMode={isDarkMode}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="My Rank"
                value={`#${dashboardStats?.userRank.rank || '-'}`}
                icon={<EmojiEventsIcon />}
                color="#8b5cf6"
                trend={{
                  value: `${dashboardStats?.userRank.completedTasks || 0} tasks`,
                  isPositive: true,
                }}
                subtitle={`of ${dashboardStats?.userRank.totalUsers || 0} users`}
                gradientPreset={gradientPreset}
                isDarkMode={isDarkMode}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Total Tasks"
                value={dashboardStats?.taskStats.totalTasks.toLocaleString() || '0'}
                icon={<TrendingUpIcon />}
                color="#3b82f6"
                trend={{
                  value: `${dashboardStats?.taskStats.tasksByStatus.done || 0} completed`,
                  isPositive: true,
                }}
                subtitle="All time"
                gradientPreset={gradientPreset}
                isDarkMode={isDarkMode}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Time Range Selector & Charts Row */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <LiquidGlassCard gradientPreset={gradientPreset} isDarkMode={isDarkMode} sx={{ p: 3, height: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {getChartTitle()}
                  </Typography>
                  <ToggleButtonGroup
                    value={timeRange}
                    exclusive
                    onChange={handleTimeRangeChange}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          '&:hover': {
                            backgroundColor: 'rgba(16, 185, 129, 0.3)',
                          },
                        },
                      },
                    }}
                  >
                    <ToggleButton value="7d">7D</ToggleButton>
                    <ToggleButton value="1m">1M</ToggleButton>
                    <ToggleButton value="3m">3M</ToggleButton>
                    <ToggleButton value="6m">6M</ToggleButton>
                    <ToggleButton value="1y">1Y</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box height={300}>
                  {customerTrendData ? (
                    <Line data={customerTrendData} options={chartOptions} />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <CircularProgress size={40} />
                    </Box>
                  )}
                </Box>
              </LiquidGlassCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <LiquidGlassCard gradientPreset={gradientPreset} isDarkMode={isDarkMode} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                  📊 Task Status
                </Typography>
                <Box height={300}>
                  {taskStatusData ? (
                    <Doughnut data={taskStatusData} options={doughnutOptions} />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <CircularProgress size={40} />
                    </Box>
                  )}
                </Box>
              </LiquidGlassCard>
            </Grid>
          </Grid>
        </Box>

        {/* Leaderboard & Pending Tasks */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 7 }}>
              {leaderboard && (
                <LeaderboardCard
                  topPerformers={leaderboard.topPerformers}
                  myRank={{
                    rank: leaderboard.myRank.rank,
                    score: leaderboard.myRank.score,
                    progressToNext: leaderboard.myRank.progressToNext,
                    completedTasks: leaderboard.myRank.completedTasks,
                  }}
                  gradientPreset={gradientPreset}
                  isDarkMode={isDarkMode}
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <PendingTasksList
                tasks={pendingTasks}
                gradientPreset={gradientPreset}
                isDarkMode={isDarkMode}
                onTaskClick={handleTaskClick}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

// Avatar component for quick actions
const Avatar: React.FC<{ children: React.ReactNode; sx?: any }> = ({ children, sx }) => (
  <Box sx={{ ...sx, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
  </Box>
);

export default DashboardPage;