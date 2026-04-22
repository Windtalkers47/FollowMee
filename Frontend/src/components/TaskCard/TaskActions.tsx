import React from 'react';
import { Box, Button } from '@mui/material';
import { Task } from '../../api/task.api';
import { TaskPermissions } from '../../permissions/taskPermissions';

interface TaskActionsProps {
  task: Task;
  permissions: TaskPermissions;
  onMarkDone?: (taskId: string) => void;
  onMarkUndone?: (taskId: string) => void;
  onApproveTask?: (taskId: string) => void;
}

const TaskActions: React.FC<TaskActionsProps> = ({
  task,
  permissions,
  onMarkDone,
  onMarkUndone,
  onApproveTask,
}) => {

  const buttonStyle = {
    borderRadius: 15,
    textTransform: 'none' as const,
    fontWeight: 600,
    px: 1.5,
    py: 0.5,
    fontSize: '0.75rem',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    '&:hover': {
      transform: 'translateY(-1px)',
    }
  };

  const getButtonVariant = (color: string, gradient: string) => ({
    ...buttonStyle,
    background: gradient,
    boxShadow: `0 4px 12px ${color}`,
    '&:hover': {
      background: gradient.replace('100%)', '85%)'),
      boxShadow: `0 6px 16px ${color}`,
    }
  });

  return (
    <Box sx={{ 
      position: 'absolute',
      bottom: 8,
      right: 8,
      display: 'flex',
      gap: 0.5,
      zIndex: 10
    }}>
      {/* For assignee: Mark as Review (instead of Done) - Only when task is in progress */}
      {permissions.canSubmit && task.status === 'in_progress' && (
        <Button
          size="small"
          startIcon={<span>✓</span>}
          onClick={() => onMarkDone?.(task.taskId)}
          variant="contained"
          color="primary"
          sx={getButtonVariant('rgba(59, 130, 246, 0.4)', 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)')}
        >
          Submit for Review
        </Button>
      )}

      {/* For creator: Approve task from Review to Done */}
      {permissions.canApprove && task.status === 'review' && (
        <Button
          size="small"
          startIcon={<span>✓</span>}
          onClick={() => onApproveTask?.(task.taskId)}
          variant="contained"
          color="success"
          sx={getButtonVariant('rgba(16, 185, 129, 0.4)', 'linear-gradient(135deg, #10b981 0%, #059669 100%)')}
        >
          Approve
        </Button>
      )}

      {/* For creator: Reject task from Review to To Do */}
      {permissions.canReject && task.status === 'review' && (
        <Button
          size="small"
          startIcon={<span>×</span>}
          onClick={() => onMarkUndone?.(task.taskId)}
          variant="contained"
          color="warning"
          sx={getButtonVariant('rgba(245, 158, 11, 0.4)', 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)')}
        >
          Reject
        </Button>
      )}

      {/* For undo completed tasks */}
      {permissions.canUndo && task.status === 'done' && (
        <Button
          size="small"
          startIcon={<span>↩</span>}
          onClick={() => onMarkUndone?.(task.taskId)}
          variant="contained"
          color="warning"
          sx={getButtonVariant('rgba(245, 158, 11, 0.4)', 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)')}
        >
          Undo
        </Button>
      )}
    </Box>
  );
};

export default React.memo(TaskActions);
