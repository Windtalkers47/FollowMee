import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import feedback from '../../services/feedback.service';
import { Task } from '../../api/task.api';
import { TaskPermissions } from '../../permissions/taskPermissions';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface TaskMenuProps {
  anchorEl: HTMLElement | null;
  task: Task;
  permissions: TaskPermissions;
  onMenuClose: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void;
}

const TaskMenu: React.FC<TaskMenuProps> = ({
  anchorEl,
  task,
  permissions,
  onMenuClose,
  onEdit,
  onDelete,
  onCancel,
  onUpdateTaskStatus,
}) => {
  const { t } = useUserPreferences();
  const handleEdit = () => {
    onEdit?.(task);
    onMenuClose();
  };

  const handleMoveToTodo = () => {
    onUpdateTaskStatus?.(task.taskId, 'todo');
    onMenuClose();
  };

  const handleCancel = () => {
    feedback.fire({
      title: t('task.cancelTitle'),
      text: t('task.cancelQuestion'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('task.cancelConfirm'),
      cancelButtonText: t('task.keep'),
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        onCancel?.(task.taskId);
      }
    });
    onMenuClose();
  };

  const handleDelete = () => {
    feedback.fire({
      title: t('task.deleteTitle'),
      text: t('task.deleteQuestion'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('task.deleteConfirm'),
      cancelButtonText: t('common.cancel'),
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete?.(task.taskId);
      }
    });
    onMenuClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onMenuClose}
      MenuListProps={{
        'aria-labelledby': 'more-button',
      }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 3,
        }
      }}
    >
      <MenuItem
        onClick={handleEdit}
        disabled={!permissions.canEdit}
        sx={{
          fontSize: '0.875rem',
          color: 'text.primary',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          '&.Mui-disabled': {
            opacity: 0.4,
          }
        }}
      >
        <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
        {t('task.edit')}
      </MenuItem>

      {task.status === 'draft' && (
        <MenuItem
          onClick={handleMoveToTodo}
          disabled={!permissions.canEdit}
          sx={{
            fontSize: '0.875rem',
            color: 'info.main',
            '&:hover': {
              bgcolor: 'action.hover',
            },
            '&.Mui-disabled': {
              opacity: 0.4,
            }
          }}
        >
          <ArrowForwardIcon fontSize="small" sx={{ mr: 1.5 }} />
          {t('task.moveTodo')}
        </MenuItem>
      )}

      {task.status !== 'cancelled' && (
        <MenuItem
          onClick={handleCancel}
          disabled={!permissions.canCancel}
          sx={{
            fontSize: '0.875rem',
            color: 'warning.main',
            '&:hover': {
              bgcolor: 'action.hover',
            },
            '&.Mui-disabled': {
              opacity: 0.4,
            }
          }}
        >
          <CancelIcon fontSize="small" sx={{ mr: 1.5 }} />
          {t('task.cancel')}
        </MenuItem>
      )}

      <MenuItem
        onClick={handleDelete}
        disabled={!permissions.canDelete}
        sx={{
          fontSize: '0.875rem',
          color: 'error.main',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          '&.Mui-disabled': {
            opacity: 0.4,
          }
        }}
      >
        <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
        {t('task.delete')}
      </MenuItem>
    </Menu>
  );
};

export default React.memo(TaskMenu);
