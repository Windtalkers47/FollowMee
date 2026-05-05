import { Box, Typography, Button, Divider, CircularProgress, useTheme } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { useEffect, useRef } from 'react';
import {
  selectNotifications,
  selectNotificationLoading,
  selectUnreadCount,
  selectDropdownOpen,
  setDropdownOpen,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  archiveNotification,
} from '../../store/slices/notificationSlice';
import NotificationItem from '../NotificationItem/NotificationItem';

const NotificationDropdown = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const loading = useAppSelector(selectNotificationLoading);
  const unreadCount = useAppSelector(selectUnreadCount);
  const dropdownOpen = useAppSelector(selectDropdownOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        dispatch(setDropdownOpen(false));
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, dispatch]);

  if (!dropdownOpen) return null;

  const handleMarkAsRead = (recipientId: number) => {
    dispatch(markAsRead(recipientId));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const handleDelete = (recipientId: number) => {
    dispatch(deleteNotification(recipientId));
  };

  const handleArchive = (recipientId: number) => {
    dispatch(archiveNotification(recipientId));
  };

  return (
    <Box
      ref={dropdownRef}
      sx={{
        position: 'absolute',
        top: '100%',
        right: 0,
        mt: 1,
        width: 380,
        maxHeight: 500,
        backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0, 0, 0, 0.5)'
          : '0 8px 32px rgba(0, 0, 0, 0.25)',
        border: theme.palette.mode === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.15)'
          : '1px solid rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
          borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        <Typography 
          variant="h6" 
          fontWeight={600}
          sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : '#1e293b' }}
        >
          Notifications
          {unreadCount > 0 && (
            <Typography
              component="span"
              variant="body2"
              sx={{
                ml: 1,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: 'error.main',
                color: 'white',
                fontSize: '0.75rem',
              }}
            >
              {unreadCount}
            </Typography>
          )}
        </Typography>
        {unreadCount > 0 && (
          <Button
            size="small"
            startIcon={<CheckCircle />}
            onClick={handleMarkAllAsRead}
            sx={{ 
              textTransform: 'none',
              color: theme.palette.mode === 'dark' ? 'text.primary' : '#64748b',
            }}
          >
            Mark all read
          </Button>
        )}
      </Box>

      {/* Notifications List */}
      <Box
        sx={{
          maxHeight: 400,
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            borderRadius: 3,
          },
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#64748b' }}
            >
              No notifications yet
            </Typography>
          </Box>
        ) : (
          notifications.map((recipient) => (
            <NotificationItem
              key={recipient.recipientId}
              recipient={recipient}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              onArchive={handleArchive}
            />
          ))
        )}
      </Box>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#64748b' }}
            >
              Showing {notifications.length} notifications
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default NotificationDropdown;
