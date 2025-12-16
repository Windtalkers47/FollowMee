import { useEffect, useState } from 'react';
import { Box, Container, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import api from '@/services/api';

interface Stats {
  totalUsers?: number;
  totalProducts?: number;
  totalOrders?: number;
  revenue?: number;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Replace with actual API endpoints when available
        const [usersRes, productsRes, ordersRes] = await Promise.all([
          api.get('/users/count'),
          api.get('/products/count'),
          api.get('/orders/summary'),
        ]);

        setStats({
          totalUsers: usersRes.data.count,
          totalProducts: productsRes.data.count,
          totalOrders: ordersRes.data.totalOrders,
          revenue: ordersRes.data.totalRevenue,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, navigate]);

  const StatCard = ({ title, value, color = 'primary' }: { title: string; value: string | number; color?: string }) => (
    <Grid item xs={12} sm={6} md={3}>
      <Paper
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          backgroundColor: (theme) =>
            color === 'primary' ? theme.palette.primary.light : theme.palette.secondary.light,
          color: (theme) => theme.palette.primary.contrastText,
        }}
      >
        <Typography variant="h6" component="div" gutterBottom>
          {title}
        </Typography>
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <Typography variant="h4" component="div">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
        )}
      </Paper>
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <StatCard title="Total Users" value={stats.totalUsers || 0} />
        <StatCard title="Total Products" value={stats.totalProducts || 0} color="secondary" />
        <StatCard title="Total Orders" value={stats.totalOrders || 0} />
        <StatCard 
          title="Total Revenue" 
          value={stats.revenue ? `$${stats.revenue.toLocaleString()}` : '$0'} 
          color="secondary" 
        />
      </Grid>

      {/* Recent Orders or other dashboard widgets can be added here */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 240 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">
                Recent activity will be displayed here
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 240 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {/* Add quick action buttons here */}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;
