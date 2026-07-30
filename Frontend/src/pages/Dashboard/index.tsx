import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  Avatar,
  Button,
  Alert,
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
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  clearCache,
  DashboardStats,
  LeaderboardData,
  PendingTask,
} from '../../services/api/dashboardApi';
import { gradientPresets } from '../../styles/liquidGlassStyles';
import { webSocketService } from '../../services/websocket.service';
import { brandColors } from '../../styles/designTokens';

// Register ChartJS components (once, at module level)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

type TimeRange = '1d' | '5d' | '7d' | '1m' | '3m' | '6m' | 'ytd' | '1y' | '5y';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const theme = useTheme();
  
  // Loading states - แยกตามส่วน
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  
  // Data states
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1d');
  
  // Refs
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);
  const hasInitializedWebSocket = useRef(false);
  const hasFetchedStaticData = useRef(false);
  
  const gradientPreset = 'freshGreen' as const;
  const isDarkMode = theme.palette.mode === 'dark';

  // Fetch Stats only (เรียกเมื่อเปลี่ยน time range)
  const fetchStatsOnly = useCallback(async (range: TimeRange) => {
    try {
      setIsStatsLoading(true);
      setStatsError(false);
      const stats = await getDashboardStats(range);
      setDashboardStats(stats);
    } catch (error) {
      setStatsError(true);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Static Data (Leaderboard + Pending Tasks) - เรียกครั้งเดียว
  const fetchStaticData = useCallback(async () => {
    try {
      const [leaderboardData, tasksData] = await Promise.all([
        getLeaderboard(5),
        getPendingTasks(5),
      ]);
      
      setLeaderboard(leaderboardData);
      setPendingTasks(tasksData.tasks);
    } catch (error) {
      console.error('Failed to fetch static data:', error);
    }
  }, []);

  // Initial load - เรียกทั้ง Stats และ Static Data
  useEffect(() => {
    const initialLoad = async () => {
      setIsInitialLoading(true);
      await fetchStaticData();
      setIsInitialLoading(false);
    };
    
    initialLoad();
  }, [fetchStaticData]);

  // Debounced time range change - เรียกเฉพาะ Stats
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer with 200ms debounce (เร็วขึ้นสำหรับ UX ที่ดีกว่า)
    debounceTimer.current = setTimeout(() => {
      fetchStatsOnly(timeRange);
    }, 200);
    
    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [timeRange, fetchStatsOnly]);

  // Listen for global profile update events (broadcast from App.tsx)
  useEffect(() => {
    if (!user?.userId) return;
    
    const handleProfileUpdate = (event: CustomEvent<{ userId: number; userImageUrl?: string | null }>) => {
      // Clear leaderboard cache เพื่อให้ได้ข้อมูลใหม่จาก server
      clearCache('leaderboard');
      // Refresh เฉพาะ Leaderboard และ Pending Tasks (ไม่ refresh Stats)
      fetchStaticData();
    };
    
    window.addEventListener('followmee:profile-updated', handleProfileUpdate as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('followmee:profile-updated', handleProfileUpdate as EventListener);
    };
  }, [user?.userId]);

  // Refresh static data เป็นระยะ (ทุก 2 นาที) เพื่อข้อมูลที่เป็นปัจจุบัน
  useEffect(() => {
    if (!user?.userId) return;
    
    const intervalId = setInterval(() => {
      fetchStaticData();
    }, 2 * 60 * 1000); // 2 นาที
    
    return () => clearInterval(intervalId);
  }, [user?.userId, fetchStaticData]);

  const handleTaskClick = (taskId: string) => {
    navigate(`/posts/${taskId}`);
  };

  const handleCreateTask = () => {
    navigate('/schedule');
  };

  const handleViewCustomers = () => {
    navigate('/customer');
  };

  const handleTimeRangeChange = useCallback((event: React.MouseEvent<HTMLElement>, newRange: TimeRange) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  }, []);

  // Prepare chart data with memoization
  const customerTrendData = useMemo(() => {
    if (!dashboardStats?.customerStats.customerTrend) return null;
    
    const trend = dashboardStats.customerStats.customerTrend;
    
    return {
      labels: trend.map((item) => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Active',
          data: trend.map((item) => item.active),
          fill: true,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(52, 199, 89, 0.4)');
            gradient.addColorStop(1, 'rgba(52, 199, 89, 0.0)');
            return gradient;
          },
          borderColor: brandColors.iosGreen,
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: brandColors.iosGreen,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
        {
          label: 'New',
          data: trend.map((item) => item.new),
          fill: true,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(94, 92, 230, 0.3)');
            gradient.addColorStop(1, 'rgba(94, 92, 230, 0.0)');
            return gradient;
          },
          borderColor: brandColors.indigo,
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: brandColors.indigo,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        },
      ],
    };
  }, [dashboardStats?.customerStats.customerTrend]);

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
            backgroundColor: [
              brandColors.amber,
              brandColors.blue,
              brandColors.indigo,
              brandColors.iosGreen,
              brandColors.red,
            ],
            borderRadius: 8,
            barThickness: 28,
          },
        ],
      }
    : null;

  const barChartOptions = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDarkMode ? '#fff' : '#1a1a1a',
        bodyColor: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 13,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
      },
    },
    scales: {
      y: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          font: {
            size: 11,
            weight: 500,
          },
        },
      },
      x: {
        grid: {
          display: true,
          color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          font: {
            size: 10,
          },
        },
        min: 0,
      },
    },
  }), [isDarkMode]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          font: {
            size: 11,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDarkMode ? '#fff' : '#1a1a1a',
        bodyColor: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        cornerRadius: 8,
        titleFont: {
          size: 13,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          padding: 8,
          font: {
            size: 11,
          },
          callback: (value: any) => Number.isInteger(value) ? value : '',
        },
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          padding: 8,
          font: {
            size: 10,
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
    },
  }), [isDarkMode]);

  const getChartTitle = useCallback(() => {
    const titles: Record<TimeRange, string> = {
      '1d': 'Customer Growth (24 Hours)',
      '5d': 'Customer Growth (5 Days)',
      '7d': 'Customer Growth (7 Days)',
      '1m': 'Customer Growth (1 Month)',
      '3m': 'Customer Growth (3 Months)',
      '6m': 'Customer Growth (6 Months)',
      'ytd': 'Customer Growth (Year to Date)',
      '1y': 'Customer Growth (1 Year)',
      '5y': 'Customer Growth (5 Years)',
    };
    return titles[timeRange];
  }, [timeRange]);

  if (isInitialLoading) {
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
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, minHeight: '100vh' }}>
      <Box
        sx={{ width: '100%' }}
      >
        {/* Header - Welcome only */}
        <Box mb={4}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            gutterBottom
            sx={{
              color: 'text.primary',
            }}
          >
            Welcome back, {user?.userName || 'User'}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              transition: 'color 0.3s ease',
            }}
          >
            Here's what's happening with your business today
          </Typography>
        </Box>

        {statsError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => fetchStatsOnly(timeRange)}>
                Retry
              </Button>
            }
            sx={{ mb: 3 }}
          >
            Dashboard statistics could not be loaded.
          </Alert>
        )}

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
            }}
            onClick={handleCreateTask}
          >
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'rgba(52, 199, 89, 0.14)',
                border: '2px solid rgba(52, 199, 89, 0.24)',
              }}
            >
              <AddIcon sx={{ fontSize: 24, color: 'primary.main' }} />
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
            }}
            onClick={handleViewCustomers}
          >
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'rgba(52, 199, 89, 0.14)',
                border: '2px solid rgba(52, 199, 89, 0.24)',
              }}
            >
              <ListIcon sx={{ fontSize: 24, color: 'primary.main' }} />
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
                color={brandColors.iosGreen}
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
                color={brandColors.amber}
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
                color={brandColors.indigo}
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
                color={brandColors.blue}
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
              <LiquidGlassCard 
                gradientPreset={gradientPreset} 
                isDarkMode={isDarkMode} 
                sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}
                key={`customer-growth-${timeRange}`}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                      {getChartTitle()}
                    </Typography>
                    {isStatsLoading && (
                      <CircularProgress size={16} color="primary" />
                    )}
                  </Box>
                  <ToggleButtonGroup
                    value={timeRange}
                    exclusive
                    onChange={handleTimeRangeChange}
                    size="small"
                    sx={{
                      flexWrap: 'wrap',
                      '& .MuiToggleButton-root': {
                        border: '1px solid rgba(52, 199, 89, 0.3)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        minWidth: { xs: '36px', sm: '42px' },
                        fontSize: { xs: '0.7rem', sm: '0.8rem' },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(52, 199, 89, 0.18)',
                          color: 'primary.main',
                          fontWeight: 600,
                          '&:hover': {
                            backgroundColor: 'rgba(52, 199, 89, 0.26)',
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(52, 199, 89, 0.1)',
                        },
                      },
                    }}
                  >
                    <ToggleButton value="1d">1D</ToggleButton>
                    <ToggleButton value="5d">5D</ToggleButton>
                    <ToggleButton value="7d">7D</ToggleButton>
                    <ToggleButton value="1m">1M</ToggleButton>
                    <ToggleButton value="6m">6M</ToggleButton>
                    <ToggleButton value="ytd">YTD</ToggleButton>
                    <ToggleButton value="1y">1Y</ToggleButton>
                    <ToggleButton value="5y">5Y</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box height={{ xs: 220, sm: 280, md: 300 }}>
                  {customerTrendData?.labels?.length ? (
                    <Line data={customerTrendData} options={chartOptions} />
                  ) : (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" textAlign="center">
                      <Typography fontWeight={700}>No customer history yet</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                        Add a customer to begin tracking growth.
                      </Typography>
                      <Button variant="outlined" onClick={handleViewCustomers}>View customers</Button>
                    </Box>
                  )}
                </Box>
              </LiquidGlassCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <LiquidGlassCard 
                gradientPreset={gradientPreset} 
                isDarkMode={isDarkMode} 
                sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}
                key="task-status"
              >
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#fff' : '#1a1a1a', fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                    Task status
                  </Typography>
                </Box>
                <Box height={{ xs: 220, sm: 280, md: 300 }}>
                  {taskStatusData && taskStatusData.datasets[0].data.some((value) => value > 0) ? (
                    <Bar data={taskStatusData} options={barChartOptions} />
                  ) : (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" textAlign="center">
                      <Typography fontWeight={700}>No task activity yet</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                        Create a task to see status insights here.
                      </Typography>
                      <Button variant="outlined" onClick={handleCreateTask}>Create task</Button>
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

export default DashboardPage;
