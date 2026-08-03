import { useState } from 'react';
import {
  alpha,
  Box,
  Chip,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ArchiveOutlined,
  AssignmentOutlined,
  CampaignOutlined,
  ChatBubbleOutline,
  DoneAll,
  MoreHoriz,
  PersonOutline,
  RestoreOutlined,
  ScheduleOutlined,
  Undo,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getSafeInternalPath } from '../../utils/safeNavigation';
import SmartAvatar from '../SmartAvatar/SmartAvatar';
import { NotificationRecipient } from '../../types/notification.types';
import { trackClick, trackOpen } from '../../api/notification.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedRelativeTime } from '../../utils/localeFormat';
import {
  getNotificationPresentation,
  getNotificationTypeLabel,
} from '../../utils/notificationPresentation';

interface NotificationItemProps {
  recipient: NotificationRecipient;
  onMarkAsRead: (recipientId: number) => void;
  onMarkAsUnread?: (recipientId: number) => void;
  onArchive?: (recipientId: number) => void;
  onRestore?: (recipientId: number) => void;
  onDelete?: (recipientId: number) => void;
  onNavigate?: () => void;
  archived?: boolean;
}

const NotificationItem = ({
  recipient,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
  onRestore,
  onDelete,
  onNavigate,
  archived = false,
}: NotificationItemProps) => {
  const theme = useTheme();
  const { locale, t } = useUserPreferences();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { notification } = recipient;
  const presentation = getNotificationPresentation(notification, t);

  const color = notification.notificationType.includes('COMMENT')
    || notification.notificationType === 'MENTION'
    ? theme.palette.info.main
    : notification.notificationType.includes('TASK')
      ? theme.palette.primary.main
      : theme.palette.secondary.main;

  const Icon = notification.notificationType.includes('COMMENT') || notification.notificationType === 'MENTION'
    ? ChatBubbleOutline
    : notification.notificationType.includes('TASK')
      ? AssignmentOutlined
      : notification.notificationType.includes('CUSTOMER')
        ? PersonOutline
        : notification.notificationType.includes('DEADLINE')
          ? ScheduleOutlined
          : CampaignOutlined;

  const handleClick = () => {
    if (!recipient.isRead) onMarkAsRead(recipient.recipientId);
    onNavigate?.();
    if (notification.actionUrl) navigate(getSafeInternalPath(notification.actionUrl));
    void trackOpen(recipient.recipientId, notification.notificationId);
    if (notification.actionUrl) void trackClick(recipient.recipientId, notification.notificationId);
  };

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        gap: 1.25,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'transparent',
        borderLeft: recipient.isRead ? '3px solid transparent' : `3px solid ${color}`,
        position: 'relative',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {!recipient.isRead && (
        <Box aria-label={t('notification.unread')} sx={{ position: 'absolute', left: 6, top: 20, width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
      )}
      {notification.actorUser ? (
        <SmartAvatar user={notification.actorUser} sx={{ width: 40, height: 40 }} />
      ) : (
        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', bgcolor: alpha(color, 0.14), color, display: 'grid', placeItems: 'center' }}>
          <Icon fontSize="small" />
        </Box>
      )}
      <Box
        role="button"
        tabIndex={0}
        aria-label={`${presentation.title}. ${presentation.message}`}
        onClick={handleClick}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          }
        }}
        sx={{
          minWidth: 0,
          flex: 1,
          cursor: 'pointer',
          borderRadius: 1,
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 3,
          },
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
          <Typography variant="body2" fontWeight={recipient.isRead ? 600 : 750} sx={{ flex: 1 }}>
            {presentation.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {formatLocalizedRelativeTime(notification.createdAt, locale)}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {presentation.message}
        </Typography>
        <Chip label={getNotificationTypeLabel(notification.notificationType, t)} size="small" sx={{ mt: 0.75, height: 22, bgcolor: alpha(color, 0.11), color, fontWeight: 650 }} />
      </Box>
      <IconButton
        aria-label={t('notification.actions')}
        size="small"
        onClick={event => {
          event.stopPropagation();
          setMenuAnchor(event.currentTarget);
        }}
        sx={{ width: 36, height: 36 }}
      >
        <MoreHoriz />
      </IconButton>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {recipient.isRead ? (
          onMarkAsUnread && <MenuItem onClick={event => { event.stopPropagation(); onMarkAsUnread(recipient.recipientId); setMenuAnchor(null); }}>
            <ListItemIcon><Undo fontSize="small" /></ListItemIcon><ListItemText>{t('notification.markUnread')}</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={event => { event.stopPropagation(); onMarkAsRead(recipient.recipientId); setMenuAnchor(null); }}>
            <ListItemIcon><DoneAll fontSize="small" /></ListItemIcon><ListItemText>{t('notification.markRead')}</ListItemText>
          </MenuItem>
        )}
        {archived ? (
          onRestore && <MenuItem onClick={event => { event.stopPropagation(); onRestore(recipient.recipientId); setMenuAnchor(null); }}>
            <ListItemIcon><RestoreOutlined fontSize="small" /></ListItemIcon><ListItemText>{t('notification.restore')}</ListItemText>
          </MenuItem>
        ) : (
          onArchive && <MenuItem onClick={event => { event.stopPropagation(); onArchive(recipient.recipientId); setMenuAnchor(null); }}>
            <ListItemIcon><ArchiveOutlined fontSize="small" /></ListItemIcon><ListItemText>{t('notification.archive')}</ListItemText>
          </MenuItem>
        )}
        {archived && onDelete && (
          <MenuItem sx={{ color: 'error.main' }} onClick={event => { event.stopPropagation(); onDelete(recipient.recipientId); setMenuAnchor(null); }}>
            <ListItemText>{t('notification.delete')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default NotificationItem;
