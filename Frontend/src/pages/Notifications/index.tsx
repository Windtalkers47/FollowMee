import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { DoneAll } from '@mui/icons-material';
import NotificationItem from '../../components/NotificationItem/NotificationItem';
import { notificationApi } from '../../api/notification.api';
import { NotificationRecipient } from '../../types/notification.types';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { fetchUnreadCount } from '../../store/slices/notificationSlice';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { mergeNotificationRecipients } from '../../utils/mergeNotificationRecipients';
import { PageEmpty, PageError, PageHeader, PageLoading, PageShell } from '../../components/PageState';

type View = 'all' | 'unread' | 'archived';
const PAGE_SIZE = 25;

const NotificationsPage = () => {
  const { t } = useUserPreferences();
  const dispatch = useAppDispatch();
  const realtimeItems = useAppSelector(state => state.notifications.notifications);
  const realtimeTotal = useAppSelector(state => state.notifications.total);
  const [view, setView] = useState<View>('all');
  const [items, setItems] = useState<NotificationRecipient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    if (append) setLoadMoreError(false); else setError(false);
    try {
      const response = await notificationApi.getNotifications(
        PAGE_SIZE,
        offset,
        view === 'unread',
        view === 'archived' ? 'archived' : 'active'
      );
      const incoming = response.data?.notifications ?? [];
      setItems(current => append ? mergeNotificationRecipients(current, incoming) : incoming);
      setLoadedCount(current => append ? current + incoming.length : incoming.length);
      setTotal(response.data?.total ?? 0);
    } catch {
      if (append) setLoadMoreError(true); else setError(true);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(0, false); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (view === 'archived' || realtimeItems.length === 0) return;
    const eligible = realtimeItems.filter(item =>
      !item.isArchived &&
      !item.isDeleted &&
      (view !== 'unread' || !item.isRead)
    );
    const timeout = window.setTimeout(() => {
      setItems(current => {
        const known = new Set(current.map(item => item.recipientId));
        const additions = eligible.filter(item => !known.has(item.recipientId));
        return additions.length > 0 ? [...additions, ...current] : current;
      });
      setTotal(current => Math.max(current, realtimeTotal));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [realtimeItems, realtimeTotal, view]);

  const run = async (action: () => Promise<unknown>) => {
    await action();
    await Promise.all([load(0, false), dispatch(fetchUnreadCount())]);
  };
  const groups = useMemo(() => {
    const map = new Map<string, NotificationRecipient[]>();
    items.forEach(item => {
      const notification = item.notification;
      const bucket = Math.floor(new Date(notification.createdAt).getTime() / (15 * 60 * 1000));
      const key = `${notification.notificationType}:${notification.entityType || ''}:${notification.entityId || ''}:${bucket}`;
      map.set(key, [...(map.get(key) || []), item]);
    });
    return [...map.values()];
  }, [items]);

  return (
    <PageShell maxWidth={980}>
      <PageHeader title={t('notification.title')} subtitle={t('notification.subtitle')} actions={view !== 'archived' && items.some(item => !item.isRead) ? (
          <Button startIcon={<DoneAll />} variant="outlined" onClick={() => void run(() => notificationApi.markAllAsRead())}>
            {t('notification.markAllRead')}
          </Button>
        ) : undefined} />

      <Paper variant="outlined" sx={{ mt: 3, overflow: 'hidden' }}>
        <Tabs
          value={view}
          onChange={(_, next) => setView(next)}
          variant="scrollable"
          scrollButtons={false}
          sx={{ px: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab value="all" label={t('notification.tabAll')} />
          <Tab value="unread" label={t('notification.tabUnread')} />
          <Tab value="archived" label={t('notification.tabArchived')} />
        </Tabs>

        {loading ? (
          <Box sx={{ p: 2 }}><PageLoading rows={2} label={t('feedback.loadingPage')} /></Box>
        ) : error ? (
          <Box sx={{ p: 2 }}><PageError title={t('notification.loadError')} message={t('feedback.networkHelp')} retryLabel={t('feedback.retry')} onRetry={() => void load()} /></Box>
        ) : items.length === 0 ? (
          <PageEmpty title={view === 'archived' ? t('notification.noArchived') : t('notification.caughtUp')} message={t('notification.emptyView')} />
        ) : (
          groups.map(group => (
            <Box key={group.map(item => item.recipientId).join('-')} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
              {group.length > 1 && <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}><Typography variant="caption" fontWeight={800}>{group[0].notification.title} · {t('feature.groupUpdates', { count: group.length })}</Typography><Stack direction="row"><Button size="small" sx={{ color: 'text.primary' }} onClick={() => void run(() => Promise.all(group.filter(item => !item.isRead).map(item => notificationApi.markAsRead(item.recipientId))))}>{t('feature.readGroup')}</Button>{view !== 'archived' && <Button size="small" sx={{ color: 'text.primary' }} onClick={() => void run(() => Promise.all(group.map(item => notificationApi.archiveNotification(item.recipientId))))}>{t('feature.archiveGroup')}</Button>}</Stack></Stack>}
              {group.map(item => <NotificationItem
                key={item.recipientId}
                recipient={item}
                archived={view === 'archived'}
                onMarkAsRead={id => void run(() => notificationApi.markAsRead(id))}
                onMarkAsUnread={id => void run(() => notificationApi.markAsUnread(id))}
                onArchive={id => void run(() => notificationApi.archiveNotification(id))}
                onRestore={id => void run(() => notificationApi.restoreNotification(id))}
                onDelete={id => setDeleteId(id)}
              />)}
            </Box>
          ))
        )}
        {!loading && items.length > 0 && (
          <Stack alignItems="center" gap={1} sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{t('notification.showing', { shown: items.length, total })}</Typography>
            {loadMoreError && <Alert severity="error" sx={{ width: '100%' }} action={<Button onClick={() => void load(loadedCount, true)}>{t('feedback.retry')}</Button>}>{t('notification.loadMoreError')}</Alert>}
            {loadedCount < total && !loadMoreError && <Button variant="outlined" disabled={loadingMore} onClick={() => void load(loadedCount, true)}>{loadingMore ? t('common.loading') : t('notification.loadMore')}</Button>}
          </Stack>
        )}
      </Paper>
      <ConfirmDialog
        open={deleteId !== null}
        title={t('notification.deleteArchivedTitle')}
        message={t('notification.deleteArchivedText')}
        confirmLabel={t('notification.delete')}
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId === null) return;
          const id = deleteId;
          setDeleteId(null);
          void run(() => notificationApi.deleteNotification(id));
        }}
      />
    </PageShell>
  );
};

export default NotificationsPage;
