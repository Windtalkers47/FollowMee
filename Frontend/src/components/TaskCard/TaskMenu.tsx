import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
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
  onMarkDone?: (taskId: string) => void;
  onMarkUndone?: (taskId: string) => void;
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
  onMarkDone,
  onMarkUndone,
  onUpdateTaskStatus,
}) => {
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

  const handleMarkDone = () => {
    onMarkDone?.(task.taskId);
    onMenuClose();
  };

  const handleMarkUndone = () => {
    onMarkUndone?.(task.taskId);
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
    >
      <MenuItem onClick={handleEdit} disabled={!permissions.canEdit}>
        <EditIcon fontSize="small" sx={{ mr: 1 }} />
        Edit
      </MenuItem>
      {task.status === 'draft' && (
        <MenuItem onClick={handleMoveToTodo} disabled={!permissions.canEdit}>
          <span style={{ marginRight: '8px' }}>»</span>
          Move to Todo
        </MenuItem>
      )}
      <MenuItem onClick={handleCancel} disabled={!permissions.canCancel}>
        <span style={{ marginRight: '8px' }}>×</span>
        Cancel
      </MenuItem>
      {task.status !== 'done' && task.status !== 'draft' && (
        <MenuItem onClick={handleMarkDone} disabled={!permissions.canSubmit}>
          Mark Done
        </MenuItem>
      )}
      {task.status === 'done' && (
        <MenuItem onClick={handleMarkUndone} disabled={!permissions.canUndo}>
          Mark Undone
        </MenuItem>
      )}
      <MenuItem onClick={handleDelete} disabled={!permissions.canDelete}>
        <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
        Delete
      </MenuItem>
    </Menu>
  );
};

export default React.memo(TaskMenu);
