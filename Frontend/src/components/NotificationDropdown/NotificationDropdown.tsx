import { useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DoneAll } from '@mui/icons-material';
import { isToday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  archiveNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  markAsSeen,
  markAsUnread,
  selectDropdownOpen,
  selectNotificationError,
  selectNotificationLoading,
  selectNotifications,
  selectUnreadCount,
  setDropdownOpen,
} from '../../store/slices/notificationSlice';
import NotificationItem from '../NotificationItem/NotificationItem';

const NotificationDropdown = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const storedNotifications = useAppSelector(selectNotifications);
  const notifications = useMemo(
    () => storedNotifications.filter(item => !item.isArchived && !item.isDeleted),
    [storedNotifications],
  );
  const loading = useAppSelector(selectNotificationLoading);
  const error = useAppSelector(selectNotificationError);
  const unreadCount = useAppSelector(selectUnreadCount);
  const open = useAppSelector(selectDropdownOpen);
  const ref = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => ({
    today: notifications.filter(item => isToday(new Date(item.notification.createdAt))),
    earlier: notifications.filter(item => !isToday(new Date(item.notification.createdAt))),
  }), [notifications]);

  useEffect(() => {
    if (!open) return;
    const unseen = notifications.filter(item => !item.isSeen).slice(0, 8);
    unseen.forEach(item => void dispatch(markAsSeen(item.recipientId)));
  }, [open, notifications, dispatch]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) dispatch(setDropdownOpen(false));
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch(setDropdownOpen(false));
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open, dispatch]);

  if (!open) return null;
  const close = () => dispatch(setDropdownOpen(false));

  const renderGroup = (label: string, items: typeof notifications) => items.length > 0 && (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 2, pt: 1.25, pb: 0.5, fontWeight: 750 }}>
        {label}
      </Typography>
      {items.map(item => (
        <NotificationItem
          key={item.recipientId}
          recipient={item}
          onMarkAsRead={id => void dispatch(markAsRead(id))}
          onMarkAsUnread={id => void dispatch(markAsUnread(id))}
          onArchive={id => void dispatch(archiveNotification(id))}
          onNavigate={close}
        />
      ))}
    </Box>
  );

  return (
    <Box
      ref={ref}
      role="dialog"
      aria-label="Notifications"
      sx={{
        position: isMobile ? 'fixed' : 'absolute',
        top: isMobile ? 64 : '100%',
        right: isMobile ? 12 : 0,
        left: isMobile ? 12 : 'auto',
        mt: isMobile ? 0 : 1,
        width: isMobile ? 'auto' : 420,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: isMobile ? 'calc(100dvh - 84px)' : 560,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: isMobile ? 3 : 2.5,
        boxShadow: theme.shadows[12],
        overflow: 'hidden',
        zIndex: theme.zIndex.modal,
      }}
    >
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={750}>Notifications</Typography>
          <Typography variant="caption" color="text.secondary">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Button size="small" startIcon={<DoneAll />} onClick={() => void dispatch(markAllAsRead())}>
            Mark all read
          </Button>
        )}
      </Box>
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 5, display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>
        ) : error ? (
          <Alert severity="error" action={<Button size="small" onClick={() => void dispatch(fetchNotifications({ limit: 8 }))}>Retry</Button>}>
            Unable to load notifications.
          </Alert>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography fontWeight={700}>No notifications yet</Typography>
            <Typography variant="body2" color="text.secondary">Assignments and team conversations will appear here.</Typography>
          </Box>
        ) : (
          <>
            {renderGroup('Today', groups.today)}
            {renderGroup('Earlier', groups.earlier)}
          </>
        )}
      </Box>
      <Divider />
      <Button
        onClick={() => {
          close();
          navigate('/notifications');
        }}
        sx={{ m: 1, minHeight: 44 }}
      >
        View all notifications
      </Button>
    </Box>
  );
};

export default NotificationDropdown;
