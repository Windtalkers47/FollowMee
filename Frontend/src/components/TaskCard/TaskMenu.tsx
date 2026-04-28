import React from 'react';
import { Menu, MenuItem, Typography, useTheme } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import { Task } from '../../api/task.api';
import { TaskPermissions } from '../../permissions/taskPermissions';

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const handleEdit = () => {
    onEdit?.(task);
    onMenuClose();
  };

  const handleMoveToTodo = () => {
    onUpdateTaskStatus?.(task.taskId, 'todo');
    onMenuClose();
  };

  const handleCancel = () => {
    Swal.fire({
      title: 'Cancel Task?',
      text: 'Are you sure you want to cancel this task?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f44336',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No, keep it',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        onCancel?.(task.taskId);
      }
    });
    onMenuClose();
  };

  const handleDelete = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this task!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
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
          background: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.15)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.5)'
            : '0 4px 20px rgba(0,0,0,0.1)',
        }
      }}
    >
      <MenuItem
        onClick={handleEdit}
        disabled={!permissions.canEdit}
        sx={{
          fontSize: '0.875rem',
          color: isDark ? '#fff' : '#000',
          '&:hover': {
            background: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-disabled': {
            opacity: 0.4,
          }
        }}
      >
        <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
        Edit
      </MenuItem>

      {task.status === 'draft' && (
        <MenuItem
          onClick={handleMoveToTodo}
          disabled={!permissions.canEdit}
          sx={{
            fontSize: '0.875rem',
            color: '#0A84FF',
            '&:hover': {
              background: isDark
                ? 'rgba(10, 132, 255, 0.1)'
                : 'rgba(10, 132, 255, 0.08)',
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

      {task.status !== 'cancelled' && (
        <MenuItem
          onClick={handleCancel}
          disabled={!permissions.canCancel}
          sx={{
            fontSize: '0.875rem',
            color: '#FF9500',
            '&:hover': {
              background: isDark
                ? 'rgba(255, 159, 10, 0.1)'
                : 'rgba(255, 159, 10, 0.08)',
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
        onClick={handleDelete}
        disabled={!permissions.canDelete}
        sx={{
          fontSize: '0.875rem',
          color: '#FF3B30',
          '&:hover': {
            background: isDark
              ? 'rgba(255, 59, 48, 0.1)'
              : 'rgba(255, 59, 48, 0.08)',
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
  );
};

export default React.memo(TaskMenu);
