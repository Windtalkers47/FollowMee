import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { DoneAll, NotificationsNone } from '@mui/icons-material';
import NotificationItem from '../../components/NotificationItem/NotificationItem';
import { notificationApi } from '../../api/notification.api';
import { NotificationRecipient } from '../../types/notification.types';
import { useAppDispatch } from '../../store/store';
import { fetchUnreadCount } from '../../store/slices/notificationSlice';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';

type View = 'all' | 'unread' | 'archived';

const NotificationsPage = () => {
  const dispatch = useAppDispatch();
  const [view, setView] = useState<View>('all');
  const [items, setItems] = useState<NotificationRecipient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await notificationApi.getNotifications(
        50,
        0,
        view === 'unread',
        view === 'archived' ? 'archived' : 'active'
      );
      setItems(response.data?.notifications ?? []);
      setTotal(response.data?.total ?? 0);
    } catch {
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    await action();
    await Promise.all([load(), dispatch(fetchUnreadCount())]);
  };

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: { xs: 2, md: 4 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} alignItems={{ sm: 'center' }}>
        <Box>
          <Typography variant="h3" fontWeight={800}>Notifications</Typography>
          <Typography color="text.secondary">Assignments, replies and important changes that need your attention.</Typography>
        </Box>
        {view !== 'archived' && items.some(item => !item.isRead) && (
          <Button startIcon={<DoneAll />} variant="outlined" onClick={() => void run(() => notificationApi.markAllAsRead())}>
            Mark all read
          </Button>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ mt: 3, overflow: 'hidden' }}>
        <Tabs
          value={view}
          onChange={(_, next) => setView(next)}
          variant="scrollable"
          scrollButtons={false}
          sx={{ px: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab value="all" label="All" />
          <Tab value="unread" label="Unread" />
          <Tab value="archived" label="Archived" />
        </Tabs>

        {loading ? (
          <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>{error}</Alert>
        ) : items.length === 0 ? (
          <Stack alignItems="center" spacing={1} sx={{ py: 8, px: 2, textAlign: 'center' }}>
            <NotificationsNone sx={{ fontSize: 42, color: 'text.disabled' }} />
            <Typography fontWeight={750}>{view === 'archived' ? 'No archived notifications' : 'You are all caught up'}</Typography>
            <Typography variant="body2" color="text.secondary">There are no notifications in this view.</Typography>
          </Stack>
        ) : (
          items.map(item => (
            <NotificationItem
              key={item.recipientId}
              recipient={item}
              archived={view === 'archived'}
              onMarkAsRead={id => void run(() => notificationApi.markAsRead(id))}
              onMarkAsUnread={id => void run(() => notificationApi.markAsUnread(id))}
              onArchive={id => void run(() => notificationApi.archiveNotification(id))}
              onRestore={id => void run(() => notificationApi.restoreNotification(id))}
              onDelete={id => {
                setDeleteId(id);
              }}
            />
          ))
        )}
        {!loading && items.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1.5, textAlign: 'center' }}>
            Showing {items.length} of {total}
          </Typography>
        )}
      </Paper>
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete archived notification?"
        message="This notification will be permanently deleted and cannot be restored."
        confirmLabel="Delete permanently"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId === null) return;
          const id = deleteId;
          setDeleteId(null);
          void run(() => notificationApi.deleteNotification(id));
        }}
      />
    </Box>
  );
};

export default NotificationsPage;
