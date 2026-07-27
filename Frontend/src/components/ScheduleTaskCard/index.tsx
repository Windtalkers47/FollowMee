import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  useTheme,
  Checkbox
} from '@mui/material';
import Swal from 'sweetalert2';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Cancel as CancelIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { parseISO, isPast, isToday } from 'date-fns';
import { Task, TaskLikeSummary } from '../../api/task.api';
import { getTaskPermissions } from '../../permissions/taskPermissions';
// Removed useLongPress - using Tap instead for better UX

interface Props {
  task: Task;
  likeSummary?: TaskLikeSummary;
  currentUserId: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onStartProgress?: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void;
  onMarkDone?: (taskId: string) => void;
  onMarkUndone?: (taskId: string) => void;
  onUndo?: (taskId: string) => void;
  // Selection mode props
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  isInSelectionMode?: boolean;
  onEnterSelectionMode?: () => void;
  onCardClick?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return '#9e9e9e';
    case 'todo': return '#0A84FF';
    case 'in_progress': return '#FF9F0A';
    case 'done': return '#30D158';
    case 'review': return '#9c27b0';
    case 'cancelled': return '#f44336';
    default: return '#8E8E93';
  }
};

const getDue = (task: Task) => {
  if (!task.dueDate) return null;

  const date = parseISO(task.dueDate);
  const now = new Date();

  if (isPast(date) && !isToday(date)) {
    return { text: 'Overdue', color: '#FF3B30' };
  }
  if (isToday(date)) {
    return { text: 'Today', color: '#FF9F0A' };
  }
  return { text: 'Upcoming', color: '#34C759' };
};

const ScheduleTaskCard: React.FC<Props> = ({
  task,
  likeSummary,
  currentUserId,
  onEdit,
  onDelete,
  onComment,
  onStartProgress,
  onApprove,
  onReject,
  onCancel,
  onUpdateTaskStatus,
  onMarkDone,
  onMarkUndone,
  onUndo,
  // Selection mode props
  isSelected = false,
  onToggleSelect,
  isInSelectionMode = false,
  onEnterSelectionMode,
  onCardClick
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const isDark = theme.palette.mode === 'dark';

  const permissions = useMemo(() =>
    getTaskPermissions({ userId: currentUserId, task }),
    [currentUserId, task]
  );

  const due = getDue(task);

  // Tap handler for selection mode - simpler and more discoverable than long press
  const handleCardClick = () => {
    if (isInSelectionMode) {
      // In selection mode: tap toggles selection
      onToggleSelect?.(task.taskId);
    } else {
      // Normal mode: open detail or start working
      onCardClick?.();
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    e.stopPropagation();
    console.log('[ScheduleTaskCard] Checkbox changed:', task.taskId, 'checked:', checked);
    console.log('[ScheduleTaskCard] Current isSelected:', isSelected);
    onToggleSelect?.(task.taskId);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[ScheduleTaskCard] Checkbox clicked:', task.taskId);
    console.log('[ScheduleTaskCard] isInSelectionMode:', isInSelectionMode);
    
    // Always enter selection mode first
    onEnterSelectionMode?.();
    
    // Then toggle selection immediately (not via setTimeout)
    onToggleSelect?.(task.taskId);
  };

  return (
    <Box
      data-testid={`task-card-${task.taskId}`}
      onClick={handleCardClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 220,
        p: 3,
        borderRadius: 3,
        cursor: isInSelectionMode ? 'pointer' : 'default',
        position: 'relative',

        backgroundColor: isSelected ? 'action.selected' : 'background.paper',
        border: isSelected
          ? `2px solid ${theme.palette.primary.main}`
          : `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          backgroundColor: isSelected ? 'action.selected' : 'action.hover',
          borderColor: isSelected ? 'primary.main' : 'text.disabled',
        },
      }}
    >
      {/* Header - Checkbox + Title + Menu */}
      <Box 
        display="flex" 
        alignItems="flex-start" 
        gap={2.5} 
        mb={2} 
        sx={{ 
          position: 'relative',
        }}
      >
        {/* Checkbox - Only visible in selection mode or when selected */}
        <Box
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          sx={{
            opacity: isInSelectionMode || isSelected ? 1 : 0,
            transition: 'opacity 0.2s ease',
            flexShrink: 0,
            pt: 0.5,
            zIndex: 10,
            pointerEvents: 'auto',
          }}
          className="task-checkbox"
        >
          <Checkbox
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={handleCheckboxClick}
            size="medium"
            sx={{
              p: 0.5,
              color: isSelected ? '#0A84FF' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'),
              '&.Mui-checked': {
                color: '#0A84FF',
              },
              '& .MuiSvgIcon-root': {
                fontSize: 22,
              }
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          fontWeight={600}
          fontSize="1.05rem"
          sx={{
            lineHeight: 1.4,
            color: isDark ? '#fff' : '#000',
            flex: 1,
            minWidth: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {task.title}
        </Typography>

        {/* Menu Button */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
          }}
          sx={{
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            p: 0.5,
            flexShrink: 0,
            '&:hover': {
              color: isDark ? '#fff' : '#000',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            }
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Description - Flexible content area */}
      {task.description && (
        <Typography
          variant="body2"
          sx={{
            opacity: 0.6,
            mb: 2,
            lineHeight: 1.5,
            color: isDark ? '#fff' : '#000',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: '0 0 auto',
            minHeight: 0,
          }}
        >
          {task.description}
        </Typography>
      )}

      {/* Meta chips */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
        {/* Status Chip */}
        <Chip
          label={task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          size="small"
          sx={{
            background: getStatusColor(task.status),
            color: '#fff',
            fontWeight: 500,
            fontSize: '0.75rem',
            height: 24,
            borderRadius: 1.5,
          }}
        />

        {/* Assignee */}
        {task.assignedTo && (
          <Chip
            icon={<PersonIcon sx={{ fontSize: 14 }} />}
            label={task.assignedToUser?.userName || `User ${task.assignedTo}`}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 24,
              borderRadius: 1.5,
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              '& .MuiChip-icon': {
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
              }
            }}
          />
        )}

        {/* Due Date */}
        {due && (
          <Chip
            icon={<CalendarIcon sx={{ fontSize: 14 }} />}
            label={due.text}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 24,
              borderRadius: 1.5,
              borderColor: `${due.color}40`,
              color: due.color,
              '& .MuiChip-icon': {
                color: due.color,
              }
            }}
          />
        )}
      </Box>

      {/* Spacer - pushes actions to bottom */}
      <Box sx={{ flex: 1 }} />

      {/* CTA Button - Start Progress */}
      {permissions.canStart && onStartProgress && !isInSelectionMode && (
        <Button
          fullWidth
          onClick={(e) => {
            e.stopPropagation();
            onStartProgress(task.taskId);
          }}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            py: 1,
            mt: 'auto',
            background: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(10, 132, 255, 0.1)',
            color: '#0A84FF',
            border: isDark ? '1px solid rgba(10, 132, 255, 0.3)' : '1px solid rgba(10, 132, 255, 0.2)',
            '&:hover': {
              background: isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(10, 132, 255, 0.15)',
            }
          }}
          startIcon={<CheckIcon />}
        >
          Start Working
        </Button>
      )}

      {/* Selection Mode Hint */}
      {isInSelectionMode && !isSelected && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            mt: 1
          }}
        >
          Tap to select
        </Typography>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            minWidth: 160,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            onEdit(task);
            setAnchorEl(null);
          }}
          disabled={!permissions.canEdit}
          sx={{
            fontSize: '0.875rem',
            color: isDark ? '#fff' : '#000',
            '&:hover': {
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-disabled': {
              opacity: 0.4,
            }
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
          Edit
        </MenuItem>

        {task.status === 'draft' && onUpdateTaskStatus && (
          <MenuItem
            onClick={() => {
              onUpdateTaskStatus(task.taskId, 'todo');
              setAnchorEl(null);
            }}
            disabled={!permissions.canEdit}
            sx={{
              fontSize: '0.875rem',
              color: '#0A84FF',
              '&:hover': {
                background: isDark ? 'rgba(10, 132, 255, 0.1)' : 'rgba(10, 132, 255, 0.08)',
              },
              '&.Mui-disabled': {
                opacity: 0.4,
              }
            }}
          >
            <Typography sx={{ mr: 1.5, fontSize: 16 }}>→</Typography>
            Move to Todo
          </MenuItem>
        )}

        {task.status !== 'cancelled' && onCancel && (
          <MenuItem
            onClick={() => {
              onCancel?.(task.taskId);
              setAnchorEl(null);
            }}
            disabled={!permissions.canCancel}
            sx={{
              fontSize: '0.875rem',
              color: '#FF9500',
              '&:hover': {
                background: isDark ? 'rgba(255, 159, 10, 0.1)' : 'rgba(255, 159, 10, 0.08)',
              },
              '&.Mui-disabled': {
                opacity: 0.4,
              }
            }}
          >
            <CancelIcon fontSize="small" sx={{ mr: 1.5 }} />
            Cancel Task
          </MenuItem>
        )}

        <MenuItem
          onClick={async () => {
            setAnchorEl(null);
            const result = await Swal.fire({
              title: 'Delete Task?',
              text: 'Are you sure you want to delete this task? This action cannot be undone.',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#FF3B30',
              cancelButtonColor: '#757575',
              confirmButtonText: 'Yes, delete it!',
              cancelButtonText: 'Cancel',
              reverseButtons: true,
            });

            if (result.isConfirmed) {
              onDelete(task.taskId);
            }
          }}
          disabled={!permissions.canDelete}
          sx={{
            fontSize: '0.875rem',
            color: '#FF3B30',
            '&:hover': {
              background: isDark ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.08)',
            },
            '&.Mui-disabled': {
              opacity: 0.4,
            }
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ScheduleTaskCard;
