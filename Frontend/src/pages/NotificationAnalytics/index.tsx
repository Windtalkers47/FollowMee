import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  Visibility,
  TouchApp,
  AccessTime,
} from '@mui/icons-material';
import { getDashboardMetrics, getQuickSummary } from '../../api/notification.api';

interface DashboardMetrics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickThroughRate: number;
  avgTimeToClick: number | null;
  byDeviceType: DeviceTypeStats[];
  byNotificationType: NotificationTypeStats[];
  topNotifications: TopNotification[];
  trendData: TrendDataPoint[];
}

interface DeviceTypeStats {
  deviceType: string;
  count: number;
  openRate: number;
  clickRate: number;
}

interface NotificationTypeStats {
  notificationType: string;
  count: number;
  openRate: number;
  clickRate: number;
}

interface TopNotification {
  notificationId: number;
  title: string;
  notificationType: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
}

interface TrendDataPoint {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
}

const NotificationAnalytics = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [quickSummary, dashboard] = await Promise.all([
        getQuickSummary(),
        getDashboardMetrics(),
      ]);

      if (dashboard.success && dashboard.data) {
        setMetrics(dashboard.data);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number | null): string => {
    if (ms === null || ms === undefined) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDeviceIcon = (deviceType: string): string => {
    switch (deviceType) {
      case 'mobile': return '📱';
      case 'tablet': return '📟';
      case 'desktop': return '💻';
      default: return '❓';
    }
  };

  const getNotificationTypeIcon = (type: string): string => {
    if (type.includes('TASK')) return '📋';
    if (type.includes('COMMENT')) return '💬';
    if (type.includes('LIKE')) return '❤️';
    if (type.includes('CUSTOMER')) return '👤';
    if (type.includes('SYSTEM')) return '🔔';
    return '📢';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No analytics data available
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          📊 Notification Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track notification engagement and performance
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Total Sent
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={600}>
                {metrics.totalSent.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Visibility sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Open Rate
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={600} color="success.main">
                {metrics.openRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.totalOpened.toLocaleString()} opens
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TouchApp sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Click-Through Rate
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={600} color="warning.main">
                {metrics.clickThroughRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.totalClicked.toLocaleString()} clicks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccessTime sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Avg Time to Click
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={600} color="info.main">
                {formatTime(metrics.avgTimeToClick)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Device Type Breakdown */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                📱 By Device Type
              </Typography>
              <Box sx={{ mt: 2 }}>
                {metrics.byDeviceType.map((device) => (
                  <Box
                    key={device.deviceType}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    }}
                  >
                    <Typography sx={{ minWidth: 100 }}>
                      {getDeviceIcon(device.deviceType)} {device.deviceType}
                    </Typography>
                    <Box sx={{ flex: 1, mx: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {device.count.toLocaleString()} events
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={`${device.openRate.toFixed(1)}% open`}
                      size="small"
                      color="success"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={`${device.clickRate.toFixed(1)}% click`}
                      size="small"
                      color="warning"
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                📋 By Notification Type
              </Typography>
              <Box sx={{ mt: 2 }}>
                {metrics.byNotificationType.map((type) => (
                  <Box
                    key={type.notificationType}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                    }}
                  >
                    <Typography sx={{ minWidth: 120 }}>
                      {getNotificationTypeIcon(type.notificationType)} {type.notificationType}
                    </Typography>
                    <Box sx={{ flex: 1, mx: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {type.count.toLocaleString()} sent
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={`${type.openRate.toFixed(1)}% open`}
                      size="small"
                      color="success"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={`${type.clickRate.toFixed(1)}% click`}
                      size="small"
                      color="warning"
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Performing Notifications */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            🏆 Top Performing Notifications
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Sent</TableCell>
                  <TableCell align="right">Open Rate</TableCell>
                  <TableCell align="right">Click Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.topNotifications.map((notification) => (
                  <TableRow
                    key={notification.notificationId}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.05),
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {notification.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={notification.notificationType}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">{notification.sentCount.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${notification.openRate.toFixed(1)}%`}
                        size="small"
                        color={notification.openRate >= 70 ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${notification.clickRate.toFixed(1)}%`}
                        size="small"
                        color={notification.clickRate >= 40 ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationAnalytics;