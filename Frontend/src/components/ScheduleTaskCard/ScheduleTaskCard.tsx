import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Comment as CommentIcon,
  Favorite as FavoriteIcon
} from '@mui/icons-material';
import { parseISO, isPast, isToday, isTomorrow } from 'date-fns';
import { Task, TaskLikeSummary } from '../../api/task.api';

interface ScheduleTaskCardProps {
  task: Task;
  likeSummary?: TaskLikeSummary;
  currentUserId: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => void;
  onUnlike?: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onMarkDone?: (taskId: string) => void;
  onMarkUndone?: (taskId: string) => void;
  onUndo?: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onStartProgress?: (taskId: string) => void;
  showActions?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return '#9e9e9e';
    case 'todo': return '#2196f3';
    case 'in_progress': return '#ff9800';
    case 'review': return '#9c27b0';
    case 'done': return '#4caf50';
    case 'cancelled': return '#f44336';
    default: return '#757575';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return 'Draft';
    case 'todo': return 'To Do';
    case 'in_progress': return 'In Progress';
    case 'review': return 'Review';
    case 'done': return 'Done';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const getDueDateInfo = (task: Task) => {
  if (!task.dueDate && !task.endDate) return null;
  
  const date = task.endDate ? parseISO(task.endDate) : parseISO(task.dueDate!);
  const now = new Date();
  
  if (isPast(date) && !isToday(date)) {
    return { text: `Overdue by ${Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))} days`, color: '#f44336' };
  } else if (isToday(date)) {
    return { text: 'Due Today', color: '#ff9800' };
  } else if (isTomorrow(date)) {
    return { text: 'Due Tomorrow', color: '#ff9800' };
  } else {
    return { text: `Due in ${Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`, color: '#4caf50' };
  }
};

export const ScheduleTaskCard: React.FC<ScheduleTaskCardProps> = ({
  task,
  likeSummary,
  currentUserId,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
  onComment,
  onMarkDone,
  onMarkUndone,
  onUndo,
  onApprove,
  onReject,
  onCancel,
  onStartProgress,
  showActions = true
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Mobile swipe detection
  const swipeRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Theme-aware colors
  const isDarkMode = theme.palette.mode === 'dark';
  const cardBgColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.08)' 
    : 'rgba(0, 0, 0, 0.04)';
  const cardBorderColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.12)' 
    : 'rgba(0, 0, 0, 0.12)';
  const cardHoverBgColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.12)' 
    : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.95)' 
    : 'rgba(0, 0, 0, 0.87)';
  const secondaryTextColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.7)' 
    : 'rgba(0, 0, 0, 0.6)';
  const iconColor = isDarkMode 
    ? 'rgba(255, 255, 255, 0.6)' 
    : 'rgba(0, 0, 0, 0.6)';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const dueDateInfo = getDueDateInfo(task);
  const totalLikes = likeSummary ? Object.values(likeSummary).reduce((sum, count) => sum + count, 0) : 0;
  const commentCount = 0; // Default to 0 since commentCount doesn't exist in Task type

  // Determine action buttons based on status and user role
  const canMarkDone = task.assignedTo === currentUserId && (task.status === 'todo' || task.status === 'in_progress');
  const canApprove = task.createdBy === currentUserId && task.status === 'review';
  const canReject = task.createdBy === currentUserId && task.status === 'review';
  const canUndo = (task.createdBy === currentUserId || task.assignedTo === currentUserId) && task.status === 'done';
  const canCancel = (task.createdBy === currentUserId || task.assignedTo === currentUserId) && 
    (task.status === 'draft' || task.status === 'todo' || task.status === 'in_progress');
  const canStartProgress = task.assignedTo === currentUserId && task.status === 'todo';

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance < -50; // Swipe right (negative distance)
    
    if (isLeftSwipe && canStartProgress && onStartProgress) {
      onStartProgress(task.taskId);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'done': return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />;
      case 'in_progress': return <ScheduleIcon sx={{ color: '#ff9800', fontSize: 20 }} />;
      default: return <RadioButtonUncheckedIcon sx={{ color: '#9e9e9e', fontSize: 20 }} />;
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        background: cardBgColor,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${cardBorderColor}`,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          background: cardHoverBgColor,
          transform: 'translateY(-2px)',
          boxShadow: isDarkMode 
            ? '0 8px 25px rgba(0, 0, 0, 0.3)' 
            : '0 8px 25px rgba(0, 0, 0, 0.1)',
          '& .action-buttons': {
            opacity: 1,
            transform: 'translateY(0)'
          }
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          background: getStatusColor(task.status),
          borderRadius: '4px 0 0 4px'
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ flex: 1, mr: 1 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontSize: '1rem',
              fontWeight: 600,
              color: textColor,
              lineHeight: 1.3,
              mb: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {task.title}
          </Typography>
          
          {task.description && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: secondaryTextColor,
                fontSize: '0.875rem',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {task.description}
            </Typography>
          )}
        </Box>

        {/* Status and Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={getStatusLabel(task.status)}
            size="small"
            sx={{
              background: getStatusColor(task.status),
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 500,
              height: 24
            }}
          />
          
          {showActions && (
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                color: iconColor,
                '&:hover': {
                  color: textColor,
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Task Details */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
        {/* Assignee */}
        {task.assignedTo && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ fontSize: 16, color: iconColor }} />
            <Typography variant="caption" sx={{ color: secondaryTextColor, fontSize: '0.75rem' }}>
              {task.assignedToUser?.userName || `User ${task.assignedTo}`}
            </Typography>
          </Box>
        )}

        {/* Due Date */}
        {dueDateInfo && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarIcon sx={{ fontSize: 16, color: dueDateInfo.color }} />
            <Typography 
              variant="caption" 
              sx={{ 
                color: dueDateInfo.color, 
                fontSize: '0.75rem',
                fontWeight: 500
              }}
            >
              {dueDateInfo.text}
            </Typography>
          </Box>
        )}

        {/* Social Stats */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {totalLikes > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FavoriteIcon sx={{ fontSize: 14, color: iconColor }} />
              <Typography variant="caption" sx={{ color: secondaryTextColor, fontSize: '0.75rem' }}>
                {totalLikes}
              </Typography>
            </Box>
          )}
          
          {commentCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CommentIcon sx={{ fontSize: 14, color: iconColor }} />
              <Typography variant="caption" sx={{ color: secondaryTextColor, fontSize: '0.75rem' }}>
                {commentCount}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Swipe to Start Progress - Only for todo tasks assigned to current user */}
      {canStartProgress && onStartProgress && (
        <Box
          ref={swipeRef}
          sx={{
            mt: 1.5,
            p: 1,
            background: isDarkMode 
              ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05))'
              : 'linear-gradient(90deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05))',
            border: `1px dashed ${isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.4)'}`,
            borderRadius: 2,
            cursor: isMobile ? 'default' : 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'pan-y',
            '&:hover': !isMobile ? {
              background: isDarkMode 
                ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1))'
                : 'linear-gradient(90deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1))',
              borderColor: isDarkMode ? 'rgba(33, 150, 243, 0.5)' : 'rgba(33, 150, 243, 0.6)',
              transform: 'translateX(4px)',
            } : {},
            '&::before': {
              content: isMobile ? '"Swipe right to start working  »"' : '"Click to start working  »"',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: isDarkMode ? 'rgba(33, 150, 243, 0.8)' : 'rgba(33, 150, 243, 0.9)',
              fontSize: '0.75rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            },
            '&:active': !isMobile ? {
              transform: 'translateX(8px)',
              background: isDarkMode 
                ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.2))'
                : 'linear-gradient(90deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.2))',
            } : {}
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={!isMobile ? () => onStartProgress(task.taskId) : undefined}
        >
          <Box sx={{ height: 40 }} />
        </Box>
      )}

      {/* Action Buttons */}
      {(canMarkDone || canApprove || canReject || canUndo) && (
        <Box 
          className="action-buttons"
          sx={{
            display: 'flex',
            gap: 1,
            opacity: 0,
            transform: 'translateY(10px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            mt: 1.5
          }}
        >
          {canMarkDone && onMarkDone && (
            <Button
              size="small"
              startIcon={<span>✓</span>}
              onClick={() => onMarkDone(task.taskId)}
              variant="contained"
              sx={{
                borderRadius: 15,
                textTransform: 'none',
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                  boxShadow: '0 6px 16px rgba(76, 175, 80, 0.5)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Submit for Review
            </Button>
          )}
          
          {canApprove && onApprove && (
            <Button
              size="small"
              startIcon={<span>×</span>}
              onClick={() => onApprove(task.taskId)}
              variant="contained"
              sx={{
                borderRadius: 15,
                textTransform: 'none',
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  boxShadow: '0 6px 16px rgba(76, 175, 80, 0.5)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Approve
            </Button>
          )}
          
          {canReject && onReject && (
            <Button
              size="small"
              startIcon={<span>×</span>}
              onClick={() => onReject(task.taskId)}
              variant="contained"
              sx={{
                borderRadius: 15,
                textTransform: 'none',
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                boxShadow: '0 4px 12px rgba(244, 67, 54, 0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                  boxShadow: '0 6px 16px rgba(244, 67, 54, 0.5)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Reject
            </Button>
          )}
          
          {canUndo && onUndo && (
            <Button
              size="small"
              startIcon={<span>↺</span>}
              onClick={() => onUndo(task.taskId)}
              variant="contained"
              sx={{
                borderRadius: 15,
                textTransform: 'none',
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
                  boxShadow: '0 6px 16px rgba(255, 152, 0, 0.5)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Undo
            </Button>
          )}
        </Box>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            background: isDarkMode 
              ? 'rgba(30, 30, 30, 0.95)' 
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: isDarkMode 
              ? '1px solid rgba(255, 255, 255, 0.1)' 
              : '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: 2,
            minWidth: 150
          }
        }}
      >
        <MenuItem
          onClick={() => {
            onEdit(task);
            handleMenuClose();
          }}
          sx={{
            color: textColor,
            fontSize: '0.875rem',
            '&:hover': {
              background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Edit
        </MenuItem>
        
        {canCancel && onCancel && (
          <MenuItem
            onClick={() => {
              onCancel(task.taskId);
              handleMenuClose();
            }}
            sx={{
              color: '#ff9800',
              fontSize: '0.875rem',
              '&:hover': {
                background: 'rgba(255, 152, 0, 0.08)'
              }
            }}
          >
            <Typography sx={{ mr: 1, fontSize: 18 }}>×</Typography>
            Cancel Task
          </MenuItem>
        )}
        
        <MenuItem
          onClick={() => {
            onDelete(task.taskId);
            handleMenuClose();
          }}
          sx={{
            color: '#f44336',
            fontSize: '0.875rem',
            '&:hover': {
              background: 'rgba(244, 67, 54, 0.08)'
            }
          }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ScheduleTaskCard;
