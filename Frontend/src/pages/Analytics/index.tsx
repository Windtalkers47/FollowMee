import { Box, Typography, Paper, useTheme } from '@mui/material';
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

const AnalyticsPage = () => {
  const theme = useTheme();

  const engagementData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Engagement',
        data: [65, 59, 80, 81, 56, 55, 40],
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
        label: 'Engagement by Platform',
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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        Analytics Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" mb={4}>
        Track your social media performance and engagement metrics
      </Typography>

      <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={3} mb={3}>
        <Box gridColumn={{ xs: 'span 12', md: 'span 8' }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Engagement Overview</Typography>
            <Box height={400}>
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
                      },
                      border: {
                        display: false
                      }
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
          </Paper>
        </Box>
        <Box gridColumn={{ xs: 'span 12', md: 'span 4' }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Engagement by Platform</Typography>
            <Box height={400}>
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
                      },
                      border: {
                        display: false
                      }
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
          </Paper>
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={3}>
        {[
          { title: 'Total Followers', value: '24.5K', change: '+12%', color: 'primary.main' },
          { title: 'Engagement Rate', value: '8.2%', change: '+2.1%', color: 'success.main' },
          { title: 'Post Reach', value: '15.7K', change: '+5.3%', color: 'warning.main' },
          { title: 'New Followers', value: '1.2K', change: '+8.4%', color: 'info.main' },
        ].map((stat, index) => (
          <Box key={index} gridColumn={{ xs: 'span 6', sm: 'span 3' }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {stat.title}
              </Typography>
              <Box display="flex" alignItems="flex-end" mb={1}>
                <Typography variant="h4" component="div" sx={{ color: stat.color, mr: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="success.main" sx={{ mb: 0.5 }}>
                  {stat.change}
                </Typography>
              </Box>
              <Box sx={{ height: 4, bgcolor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <Box 
                  sx={{ 
                    height: '100%', 
                    width: '70%', 
                    bgcolor: stat.color,
                    borderRadius: 2
                  }} 
                />
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AnalyticsPage;
