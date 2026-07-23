import { Box, Typography, IconButton, Chip, useTheme, alpha } from '@mui/material';
import { CheckCircle, Delete, Archive } from '@mui/icons-material';
import SmartAvatar from '../SmartAvatar/SmartAvatar';
import { NotificationRecipient } from '../../types/notification.types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { trackOpen, trackClick } from '../../api/notification.api';

interface NotificationItemProps {
  recipient: NotificationRecipient;
  onMarkAsRead: (recipientId: number) => void;
  onDelete: (recipientId: number) => void;
  onArchive: (recipientId: number) => void;
}

const NotificationItem = ({ recipient, onMarkAsRead, onDelete, onArchive }: NotificationItemProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { notification } = recipient;

  const handleClick = async () => {
    // W5-METRICS: Track open event
    await trackOpen(recipient.recipientId, notification.notificationId);

    if (notification.actionUrl) {
      // W5-METRICS: Track click event before navigate
      await trackClick(recipient.recipientId, notification.notificationId);
      navigate(notification.actionUrl);
    }
    if (!recipient.isRead) {
      onMarkAsRead(recipient.recipientId);
    }
  };

  const getNotificationIcon = () => {
    if (notification.isSystem) {
      return '🔔';
    }
    if (notification.notificationType.includes('TASK')) {
      return '📋';
    }
    if (notification.notificationType.includes('COMMENT')) {
      return '💬';
    }
    if (notification.notificationType.includes('LIKE')) {
      return '❤️';
    }
    if (notification.notificationType.includes('CUSTOMER')) {
      return '👤';
    }
    return '📢';
  };

  const getNotificationColor = () => {
    if (notification.isSystem) {
      return theme.palette.info.main;
    }
    if (notification.notificationType.includes('TASK')) {
      return theme.palette.primary.main;
    }
    if (notification.notificationType.includes('COMMENT')) {
      return theme.palette.success.main;
    }
    if (notification.notificationType.includes('LIKE')) {
      return theme.palette.error.main;
    }
    return theme.palette.warning.main;
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        p: 2,
        display: 'flex',
        gap: 2,
        cursor: 'pointer',
        borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
        backgroundColor: !recipient.isRead
          ? alpha(getNotificationColor(), theme.palette.mode === 'dark' ? 0.15 : 0.08)
          : 'transparent',
        '&:hover': {
          backgroundColor: alpha(theme.palette.action.hover, 0.08),
        },
        position: 'relative',
      }}
    >
      {/* Unread indicator */}
      {!recipient.isRead && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: '60%',
            backgroundColor: getNotificationColor(),
            borderRadius: '0 4px 4px 0',
          }}
        />
      )}

      {/* Icon or Avatar */}
      <Box sx={{ flexShrink: 0 }}>
        {notification.actorUser ? (
          <SmartAvatar
            user={notification.actorUser}
            sx={{ width: 40, height: 40 }}
          />
        ) : (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: alpha(getNotificationColor(), 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            {getNotificationIcon()}
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography
            variant="body2"
            fontWeight={recipient.isRead ? 400 : 600}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: theme.palette.mode === 'dark' ? 'text.primary' : '#1e293b',
            }}
          >
            {notification.title}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              ml: 1, 
              flexShrink: 0,
              color: theme.palette.mode === 'dark' ? 'text.secondary' : '#64748b',
            }}
          >
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.5,
            color: theme.palette.mode === 'dark' ? 'text.secondary' : '#64748b',
          }}
        >
          {notification.message}
        </Typography>
        {notification.notificationType && (
          <Chip
            label={notification.notificationType.replace(/_/g, ' ')}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              backgroundColor: alpha(getNotificationColor(), 0.1),
              color: getNotificationColor(),
            }}
          />
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {!recipient.isRead && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(recipient.recipientId);
            }}
            sx={{ color: theme.palette.success.main }}
          >
            <CheckCircle fontSize="small" />
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(recipient.recipientId);
          }}
          sx={{ color: theme.palette.warning.main }}
        >
          <Archive fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(recipient.recipientId);
          }}
          sx={{ color: theme.palette.error.main }}
        >
          <Delete fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default NotificationItem;
