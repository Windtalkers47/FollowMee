import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
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
  type ScriptableContext,
} from 'chart.js';
import { useAppSelector } from '../../store/store';
import {
  LiquidGlassCard,
  LeaderboardCard,
  PendingTasksList,
} from '../../components/LiquidGlassDashboard';
import {
  getDashboardStats,
  getDashboardOverview,
  clearCache,
  DashboardStats,
  LeaderboardData,
  PendingTask,
} from '../../services/api/dashboardApi';
import { brandColors } from '../../styles/designTokens';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedDate, formatLocalizedNumber } from '../../utils/localeFormat';
import type { MessageKey } from '../../i18n/messages';
import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../../api/task.api';
import { rewardApi } from '../../api/reward.api';
import { prioritizeDashboardTasks } from '../../utils/dashboardPriority';
import DashboardDailyFocus from '../../components/DashboardDailyFocus';
import DashboardSummaryStrip from '../../components/DashboardSummaryStrip';
import DashboardInsightsSection from '../../components/DashboardInsightsSection';
import { PageHeader, PageShell } from '../../components/PageState';

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
  const { locale, t } = useUserPreferences();
  
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
  const gradientPreset = 'freshGreen' as const;
  const isDarkMode = theme.palette.mode === 'dark';
  const todayWork = useQuery({ queryKey: ['my-work', user?.userId], queryFn: () => taskApi.getMyWork({ limit: 50 }), enabled: Boolean(user?.userId), staleTime: 15_000 });
  const rewardSummary = useQuery({ queryKey: ['dashboard', 'achievement'], queryFn: rewardApi.summary, enabled: Boolean(user?.userId), staleTime: 30_000 });
  const todayItems = useMemo(() => prioritizeDashboardTasks(todayWork.data?.items || []), [todayWork.data?.items]);

  // Fetch Stats only (เรียกเมื่อเปลี่ยน time range)
  const fetchStatsOnly = useCallback(async (range: TimeRange) => {
    try {
      setIsStatsLoading(true);
      setStatsError(false);
      const stats = await getDashboardStats(range);
      setDashboardStats(stats);
    } catch {
      setStatsError(true);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Static Data (Leaderboard + Pending Tasks) - เรียกครั้งเดียว
  const fetchStaticData = useCallback(async () => {
    try {
      const overview = await getDashboardOverview('1d');
      setDashboardStats(overview.stats);
      setLeaderboard(overview.leaderboard);
      setPendingTasks(overview.pendingTasks.tasks);
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
    
    const handleProfileUpdate = () => {
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
  }, [user?.userId, fetchStaticData]);

  // Refresh static data เป็นระยะ (ทุก 2 นาที) เพื่อข้อมูลที่เป็นปัจจุบัน
  useEffect(() => {
    if (!user?.userId) return;
    
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchStaticData();
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
        return formatLocalizedDate(date, locale, { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: t('dashboard.activeSeries'),
          data: trend.map((item) => item.active),
          fill: true,
          backgroundColor: (context: ScriptableContext<'line'>) => {
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
          label: t('dashboard.newSeries'),
          data: trend.map((item) => item.new),
          fill: true,
          backgroundColor: (context: ScriptableContext<'line'>) => {
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
  }, [dashboardStats?.customerStats.customerTrend, locale, t]);

  const taskStatusData = dashboardStats?.taskStats.tasksByStatus
    ? {
        labels: [
          t('taskStatus.draft'),
          t('taskStatus.todo'),
          t('taskStatus.inProgress'),
          t('taskStatus.review'),
          t('taskStatus.done'),
          t('taskStatus.cancelled'),
        ],
        datasets: [
          {
            data: [
              dashboardStats.taskStats.tasksByStatus.draft,
              dashboardStats.taskStats.tasksByStatus.todo,
              dashboardStats.taskStats.tasksByStatus.in_progress,
              dashboardStats.taskStats.tasksByStatus.review,
              dashboardStats.taskStats.tasksByStatus.done,
              dashboardStats.taskStats.tasksByStatus.cancelled,
            ],
            backgroundColor: [
              '#8E8E93',
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
          callback: (value: string | number) => Number.isInteger(value) ? value : '',
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
    const periodKey = `dashboard.period.${timeRange}` as MessageKey;
    return t('dashboard.customerGrowth', { period: t(periodKey) });
  }, [timeRange, t]);

  return (
    <PageShell maxWidth={1440} sx={{ minHeight: '100vh' }}>
      {isInitialLoading && <LinearProgress aria-label={t('dashboard.loading')} sx={{ mb: 2, borderRadius: 99 }} />}
      <Box
        sx={{ width: '100%' }}
      >
        <PageHeader title={t('dashboard.welcome', { name: user?.userName || t('common.user') })} subtitle={t('dashboard.subtitle')} actions={<><Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateTask}>{t('dashboard.createTask')}</Button><Button variant="outlined" startIcon={<ListIcon />} onClick={handleViewCustomers}>{t('dashboard.viewCustomers')}</Button></>} />

        {statsError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => fetchStatsOnly(timeRange)}>
                {t('feedback.retry')}
              </Button>
            }
            sx={{ mb: 3 }}
          >
            {t('dashboard.statsError')}
          </Alert>
        )}

        {/* Primary daily focus */}
        <DashboardDailyFocus tasks={todayItems} loading={todayWork.isLoading} error={todayWork.isError} latestAchievement={rewardSummary.data?.latestAchievement} locale={locale} isDarkMode={isDarkMode} t={t} onRetry={() => void todayWork.refetch()} onOpenTask={taskId => navigate(`/tasks/${taskId}`)} onOpenMyWork={() => navigate('/my-work')} onOpenAchievements={() => navigate('/rewards')} />

        <DashboardSummaryStrip items={[
          { title: t('dashboard.totalCustomers'), value: formatLocalizedNumber(dashboardStats?.customerStats.totalCustomers || 0, locale), detail: t('dashboard.activeCount', { count: formatLocalizedNumber(dashboardStats?.customerStats.customersByStatus.active || 0, locale) }), icon: <PeopleIcon fontSize="small" />, color: brandColors.iosGreen },
          { title: t('dashboard.pendingTasks'), value: formatLocalizedNumber(dashboardStats?.taskStats.pendingTasks || 0, locale), detail: t('dashboard.needAttention'), icon: <TaskIcon fontSize="small" />, color: brandColors.amber },
          { title: t('dashboard.myRank'), value: `#${dashboardStats?.userRank.rank || '-'}`, detail: t('dashboard.taskCount', { count: formatLocalizedNumber(dashboardStats?.userRank.completedTasks || 0, locale) }), icon: <EmojiEventsIcon fontSize="small" />, color: brandColors.indigo },
          { title: t('dashboard.totalTasks'), value: formatLocalizedNumber(dashboardStats?.taskStats.totalTasks || 0, locale), detail: t('dashboard.completedCount', { count: formatLocalizedNumber(dashboardStats?.taskStats.tasksByStatus.done || 0, locale) }), icon: <TrendingUpIcon fontSize="small" />, color: brandColors.blue },
        ]} />

        <DashboardInsightsSection title={t('dashboard.insights')} subtitle={t('dashboard.insightsHint')}>

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
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      maxWidth: '100%',
                      justifyContent: { xs: 'flex-start', sm: 'flex-end' },
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
                      <Typography fontWeight={700}>{t('dashboard.noCustomerHistory')}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                        {t('dashboard.noCustomerHistoryHint')}
                      </Typography>
                      <Button variant="outlined" onClick={handleViewCustomers}>{t('dashboard.viewCustomers')}</Button>
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
                    {t('dashboard.taskStatus')}
                  </Typography>
                </Box>
                <Box height={{ xs: 220, sm: 280, md: 300 }}>
                  {taskStatusData && taskStatusData.datasets[0].data.some((value) => value > 0) ? (
                    <Bar data={taskStatusData} options={barChartOptions} />
                  ) : (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" textAlign="center">
                      <Typography fontWeight={700}>{t('dashboard.noTaskActivity')}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                        {t('dashboard.noTaskActivityHint')}
                      </Typography>
                      <Button variant="outlined" onClick={handleCreateTask}>{t('dashboard.createTask')}</Button>
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
        </DashboardInsightsSection>
      </Box>
    </PageShell>
  );
};

export default DashboardPage;
