import React from 'react';
import { Box, Typography, Grid, Paper, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '../../services/customer.service';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  People as PeopleIcon,
  AttachMoney as RevenueIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon,
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  color: string;
}) => (
  <Paper 
    elevation={2} 
    sx={{ 
      p: 3, 
      height: '100%',
      borderRadius: 2,
      background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
      borderLeft: `4px solid ${color}`,
    }}
  >
    <Box display="flex" alignItems="center">
      <Box 
        sx={{ 
          p: 1.5, 
          mr: 2, 
          borderRadius: 2, 
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon sx={{ color, fontSize: 32 }} />
      </Box>
      <Box>
        <Typography color="textSecondary" variant="subtitle2">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight="bold">
          {value}
        </Typography>
      </Box>
    </Box>
  </Paper>
);

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getCustomers(),
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  const stats = [
    { 
      title: 'Total Customers', 
      value: customers?.length || 0, 
      icon: PeopleIcon,
      color: theme.palette.primary.main 
    },
    { 
      title: 'Active Customers', 
      value: customers?.filter(c => c.isActive).length || 0, 
      icon: TrendingUpIcon,
      color: theme.palette.success.main 
    },
    { 
      title: 'New This Month', 
      value: customers?.filter(c => {
        const customerDate = new Date(c.createdAt);
        const now = new Date();
        return customerDate.getMonth() === now.getMonth() && 
               customerDate.getFullYear() === now.getFullYear();
      }).length || 0, 
      icon: ScheduleIcon,
      color: theme.palette.warning.main 
    },
    { 
      title: 'Total Revenue', 
      value: '฿0.00', 
      icon: RevenueIcon,
      color: theme.palette.info.main 
    },
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item key={index}>
            <StatCard 
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                maxWidth: { sm: '50%', md: '25%' },
                flex: { sm: '1 1 calc(50% - 16px)', md: '1 1 calc(25% - 24px)' }
              }}
            />
          </Grid>
        ))}
      </Grid>

      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 2,
          background: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" component="h2">
            Recent Activity
          </Typography>
          <Typography 
            color="primary" 
            sx={{ 
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' } 
            }}
          >
            View All
          </Typography>
        </Box>
        
        <Box>
          <Typography color="textSecondary" textAlign="center" py={4}>
            No recent activity to display
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Dashboard;
