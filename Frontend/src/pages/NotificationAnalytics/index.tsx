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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  TrendingUp,
  Visibility,
  TouchApp,
  AccessTime,
  Devices,
  Category,
  EmojiEvents,
  Download,
} from '@mui/icons-material';
import { getDashboardMetrics } from '../../api/notification.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedNumber } from '../../utils/localeFormat';
import { getDeviceLabel, getNotificationTypeLabel } from '../../utils/notificationPresentation';

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

interface NotificationAnalyticsProps { startDate?: string; endDate?: string }

const NotificationAnalytics = ({ startDate, endDate }: NotificationAnalyticsProps = {}) => {
  const theme = useTheme();
  const { locale, t } = useUserPreferences();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<DashboardMetrics | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const externalRange = Boolean(startDate && endDate);

  useEffect(() => {
    loadMetrics();
  }, [periodDays, startDate, endDate]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const end = externalRange ? new Date(`${endDate}T23:59:59.999`) : new Date();
      const start = externalRange ? new Date(`${startDate}T00:00:00`) : new Date(end.getTime() - periodDays * 86400000);
      const resolvedPeriodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
      const previousEnd = new Date(start.getTime() - 1);
      const previousStart = new Date(previousEnd.getTime() - resolvedPeriodDays * 86400000);
      const [dashboard, previous] = await Promise.all([
        getDashboardMetrics(start.toISOString(), end.toISOString()),
        getDashboardMetrics(previousStart.toISOString(), previousEnd.toISOString()),
      ]);

      if (dashboard.success && dashboard.data) {
        setMetrics(dashboard.data);
      }
      setPreviousMetrics(previous.data || null);
      setError(null);
    } catch (err) {
      setError(t('analytics.loadError'));
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number | null): string => {
    if (ms === null || ms === undefined) return t('analytics.notApplicable');
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return t('analytics.seconds', { count: seconds });
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return t('analytics.minutesSeconds', { minutes, seconds: remainingSeconds });
  };

  const rateChange = (current: number, previous?: number) => {
    if (previous === undefined) return null;
    return current - previous;
  };

  const exportCsv = () => {
    if (!metrics) return;
    const rows = [
      ['Metric', externalRange ? `${startDate} - ${endDate}` : `Last ${periodDays} days`],
      ['Total sent', metrics.totalSent],
      ['Total opened', metrics.totalOpened],
      ['Total clicked', metrics.totalClicked],
      ['Open rate', metrics.openRate.toFixed(2)],
      ['Click-through rate', metrics.clickThroughRate.toFixed(2)],
      ...metrics.topNotifications.map((item) => [
        `Notification: ${item.title}`,
        `${item.sentCount} sent | ${item.openRate.toFixed(2)}% open | ${item.clickRate.toFixed(2)}% click`
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `followmee-notification-analytics-${externalRange ? `${startDate}-${endDate}` : `${periodDays}d`}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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
        {t('analytics.notAvailable')}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>{t('analytics.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('analytics.subtitle')}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {!externalRange && <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>{t('analytics.period')}</InputLabel>
            <Select label={t('analytics.period')} value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))}>
              <MenuItem value={7}>{t('analytics.lastDays', { count: 7 })}</MenuItem>
              <MenuItem value={30}>{t('analytics.lastDays', { count: 30 })}</MenuItem>
              <MenuItem value={90}>{t('analytics.lastDays', { count: 90 })}</MenuItem>
            </Select>
          </FormControl>}
          <Button variant="outlined" startIcon={<Download />} onClick={exportCsv} disabled={!metrics || metrics.totalSent === 0}>{t('analytics.export')}</Button>
        </Stack>
      </Stack>

      <Alert severity={metrics.totalSent === 0 ? 'info' : 'success'} sx={{ mb: 3 }}>
        {metrics.totalSent === 0
          ? t('analytics.noEngagement')
          : t('analytics.currentOpenRate', { rate: metrics.openRate.toFixed(1) })}
      </Alert>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                  {t('analytics.totalSent')}
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={600}>
                {formatLocalizedNumber(metrics.totalSent, locale)}
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
                  {t('analytics.openRateTitle')}
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={600} color="success.main">
                {metrics.openRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('analytics.opens', { count: formatLocalizedNumber(metrics.totalOpened, locale) })}
              </Typography>
              {previousMetrics && (
                <Typography variant="caption" display="block" color="text.secondary">
                  {t('analytics.pointsVsPrevious', { value: `${rateChange(metrics.openRate, previousMetrics.openRate)! >= 0 ? '+' : ''}${rateChange(metrics.openRate, previousMetrics.openRate)?.toFixed(1)}` })}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TouchApp sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" color="text.secondary">
                  {t('analytics.clickThroughRate')}
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={600} color="warning.main">
                {metrics.clickThroughRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('analytics.clicks', { count: formatLocalizedNumber(metrics.totalClicked, locale) })}
              </Typography>
              {previousMetrics && (
                <Typography variant="caption" display="block" color="text.secondary">
                  {t('analytics.pointsVsPrevious', { value: `${rateChange(metrics.clickThroughRate, previousMetrics.clickThroughRate)! >= 0 ? '+' : ''}${rateChange(metrics.clickThroughRate, previousMetrics.clickThroughRate)?.toFixed(1)}` })}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccessTime sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="body2" color="text.secondary">
                  {t('analytics.avgTimeToClick')}
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
              <Box display="flex" alignItems="center" gap={1}>
                <Devices color="primary" />
                <Typography variant="h6" fontWeight={600}>{t('analytics.byDevice')}</Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                {metrics.byDeviceType.length === 0 && (
                  <Typography color="text.secondary">{t('analytics.deviceEmpty')}</Typography>
                )}
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
                      {getDeviceLabel(device.deviceType, t)}
                    </Typography>
                    <Box sx={{ flex: 1, mx: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('analytics.events', { count: formatLocalizedNumber(device.count, locale) })}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={t('analytics.openRate', { rate: device.openRate.toFixed(1) })}
                      size="small"
                      color="success"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={t('analytics.clickRate', { rate: device.clickRate.toFixed(1) })}
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
              <Box display="flex" alignItems="center" gap={1}>
                <Category color="primary" />
                <Typography variant="h6" fontWeight={600}>{t('analytics.byType')}</Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                {metrics.byNotificationType.length === 0 && (
                  <Typography color="text.secondary">{t('analytics.typeEmpty')}</Typography>
                )}
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
                      {getNotificationTypeLabel(type.notificationType, t)}
                    </Typography>
                    <Box sx={{ flex: 1, mx: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('analytics.sentCount', { count: formatLocalizedNumber(type.count, locale) })}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={t('analytics.openRate', { rate: type.openRate.toFixed(1) })}
                      size="small"
                      color="success"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={t('analytics.clickRate', { rate: type.clickRate.toFixed(1) })}
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
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
            <EmojiEvents color="primary" />
            <Typography variant="h6" fontWeight={600}>{t('analytics.topNotifications')}</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('analytics.table.title')}</TableCell>
                  <TableCell>{t('analytics.table.type')}</TableCell>
                  <TableCell align="right">{t('analytics.table.sent')}</TableCell>
                  <TableCell align="right">{t('analytics.table.openRate')}</TableCell>
                  <TableCell align="right">{t('analytics.table.clickRate')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.topNotifications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      {t('analytics.topEmpty')}
                    </TableCell>
                  </TableRow>
                )}
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
                        label={getNotificationTypeLabel(notification.notificationType, t)}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatLocalizedNumber(notification.sentCount, locale)}</TableCell>
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
