import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Avatar,
  IconButton,
  useTheme,
  LinearProgress,
  Divider,
  Chip,
  styled,
} from '@mui/material';
import Grid from '@mui/material/Grid';

import {
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  PostAdd as PostAddIcon,
  BarChart as BarChartIcon,
  People as PeopleIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

import { useAppDispatch, useAppSelector } from '../../store/store';
import { logout } from '../../features/auth/authSlice';


// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
}));

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <StyledCard>
    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography color="textSecondary" variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        <Avatar sx={{ bgcolor: `${color}20`, color: color, width: 44, height: 44 }}>
          {icon}
        </Avatar>
      </Box>
      <Typography variant="h4" component="div">
        {value}
      </Typography>
      <Box mt={1}>
        <Chip 
          label="+12% from last month" 
          size="small" 
          color="success"
          sx={{ 
            bgcolor: 'success.light',
            color: 'success.contrastText',
            fontWeight: 600,
            fontSize: '0.7rem'
          }}
        />
      </Box>
    </CardContent>
  </StyledCard>
);

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
  };

  // Chart data
  const engagementData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Engagement',
        data: [65, 59, 80, 81, 56, 55],
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4,
      },
    ],
  };

  const platformData = {
    labels: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn'],
    datasets: [
      {
        label: 'Engagement',
        data: [12, 19, 3, 5],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const recentPosts = [
    {
      id: 1,
      platform: 'Instagram',
      content: 'Check out our latest product launch! #NewProduct',
      date: '2 hours ago',
      likes: 245,
      comments: 32,
      shares: 12,
    },
    {
      id: 2,
      platform: 'Twitter',
      content: 'Exciting news coming soon! Stay tuned for updates. #ComingSoon',
      date: '5 hours ago',
      likes: 189,
      comments: 24,
      shares: 8,
    },
  ];

  if (isLoading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Welcome back, {user?.name || 'User'}! 👋
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Here's what's happening with your social media today
          </Typography>
        </Box>
        <Box>
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <NotificationsIcon />
          </IconButton>
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <SettingsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Total Followers" 
              value="24.5K" 
              icon={<PeopleIcon />} 
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Engagement Rate" 
              value="8.2%" 
              icon={<ThumbUpIcon />} 
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="New Posts" 
              value="12" 
              icon={<PostAddIcon />} 
              color={theme.palette.warning.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title="Avg. Engagement" 
              value="1.2K" 
              icon={<BarChartIcon />} 
              color={theme.palette.info.main}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Charts Row */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Engagement Overview</Typography>
                <Box height={300}>
                  <Line 
                    data={engagementData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            display: true,
                            drawBorder: false,
                          },
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Platform Performance</Typography>
                <Box height={300}>
                  <Bar 
                    data={platformData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            display: true,
                            drawBorder: false,
                          },
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Box>

      {/* Recent Posts & Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Posts</Typography>
                {recentPosts.map((post, index) => (
                  <Box key={post.id} mb={3}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Chip 
                        label={post.platform} 
                        size="small" 
                        sx={{ 
                          mr: 1,
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText',
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {post.date}
                      </Typography>
                    </Box>
                    <Typography variant="body1" paragraph>
                      {post.content}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Box display="flex" alignItems="center" mr={2}>
                        <ThumbUpIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {post.likes}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mr={2}>
                        <CommentIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {post.comments}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center">
                        <ShareIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {post.shares}
                        </Typography>
                      </Box>
                    </Box>
                    {index < recentPosts.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))}
              </CardContent>
            </StyledCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box 
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    }}
                  >
                    <Typography variant="subtitle2">Schedule Post</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Plan your content in advance
                    </Typography>
                  </Box>
                  <Box 
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    }}
                  >
                    <Typography variant="subtitle2">View Analytics</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Detailed performance metrics
                    </Typography>
                  </Box>
                  <Box 
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    }}
                  >
                    <Typography variant="subtitle2">Audience Insights</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Understand your followers
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default DashboardPage;
