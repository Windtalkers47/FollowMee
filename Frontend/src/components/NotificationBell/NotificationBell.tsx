import { useEffect } from 'react';
import { Badge, IconButton, useTheme } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  fetchUnreadCount,
  selectUnreadCount,
  selectDropdownOpen,
  setDropdownOpen,
  fetchNotifications,
} from '../../store/slices/notificationSlice';

interface NotificationBellProps {
  onDropdownToggle?: (open: boolean) => void;
}

const NotificationBell = ({ onDropdownToggle }: NotificationBellProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector(selectUnreadCount);
  
  // Ensure badgeContent is a number, not an object
  const badgeCount = typeof unreadCount === 'number' 
    ? unreadCount 
    : (unreadCount as any)?.count || 0;
  const dropdownOpen = useAppSelector(selectDropdownOpen);

  useEffect(() => {
    // Fetch unread count on mount (initial load)
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  const handleClick = () => {
    const newOpen = !dropdownOpen;
    dispatch(setDropdownOpen(newOpen));
    onDropdownToggle?.(newOpen);

    // Fetch notifications when opening dropdown
    if (newOpen) {
      dispatch(fetchNotifications({ limit: 20 }));
    }
  };

  return (
    <IconButton
      onClick={handleClick}
      sx={{
        position: 'relative',
        color: theme.palette.mode === 'dark' ? 'text.primary' : '#64748b',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.04)',
          color: theme.palette.mode === 'dark' ? 'text.primary' : '#334155',
        },
      }}
    >
      <Badge
        badgeContent={badgeCount}
        color="error"
        max={99}
        sx={{
          '& .MuiBadge-badge': {
            right: 4,
            top: 4,
            fontSize: '0.7rem',
            height: '18px',
            minWidth: '18px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          },
        }}
      >
        <NotificationsIcon sx={{ fontSize: 24 }} />
      </Badge>
    </IconButton>
  );
};

export default NotificationBell;
