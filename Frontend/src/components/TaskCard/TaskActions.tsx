import React from 'react';
import { Box, Button } from '@mui/material';
import { Task } from '../../api/task.api';
import { TaskPermissions } from '../../permissions/taskPermissions';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { gradientPresets } from '../../styles/liquidGlassStyles';

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
  const { liquidGlassSettings } = useLiquidGlass();
  const preset = gradientPresets[liquidGlassSettings.gradientPreset];

  const glassButtonStyle = {
    borderRadius: 16,
    textTransform: 'none' as const,
    fontWeight: 600,
    px: 1.5,
    py: 0.6,
    fontSize: '0.75rem',
    backdropFilter: 'blur(10px) saturate(180%)',
    WebkitBackdropFilter: 'blur(10px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
    }
  };

  const getButtonVariant = (primaryColor: string, secondaryColor: string, icon: string) => ({
    ...glassButtonStyle,
    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
    color: '#fff',
    boxShadow: `0 4px 12px ${primaryColor}66`,
    border: `1px solid ${primaryColor}80`,
    '&:hover': {
      background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
      boxShadow: `0 6px 20px ${primaryColor}99`,
    }
  });

  return (
    <Box sx={{ 
      position: 'absolute',
      bottom: 8,
      right: 8,
      display: 'flex',
      gap: 0.75,
      zIndex: 10,
      flexWrap: 'wrap',
      justifyContent: 'flex-end'
    }}>
      {/* For assignee: Mark as Review (instead of Done) - Only when task is in progress */}
      {permissions.canSubmit && task.status === 'in_progress' && (
        <Button
          size="small"
          onClick={() => onMarkDone?.(task.taskId)}
          variant="contained"
          sx={getButtonVariant('#3b82f6', '#2563eb', '✓')}
        >
          <span style={{ marginRight: 4 }}>✓</span>
          Submit for Review
        </Button>
      )}

      {/* For creator: Approve task from Review to Done */}
      {permissions.canApprove && task.status === 'review' && (
        <Button
          size="small"
          onClick={() => onApproveTask?.(task.taskId)}
          variant="contained"
          sx={getButtonVariant('#10b981', '#059669', '✓')}
        >
          <span style={{ marginRight: 4 }}>✓</span>
          Approve
        </Button>
      )}

      {/* For creator: Reject task from Review to To Do */}
      {permissions.canReject && task.status === 'review' && (
        <Button
          size="small"
          onClick={() => onMarkUndone?.(task.taskId)}
          variant="contained"
          sx={getButtonVariant('#f59e0b', '#d97706', '×')}
        >
          <span style={{ marginRight: 4 }}>×</span>
          Reject
        </Button>
      )}

      {/* For undo completed tasks */}
      {permissions.canUndo && task.status === 'done' && (
        <Button
          size="small"
          onClick={() => onMarkUndone?.(task.taskId)}
          variant="contained"
          sx={getButtonVariant('#f59e0b', '#d97706', '↩')}
        >
          <span style={{ marginRight: 4 }}>↩</span>
          Undo
        </Button>
      )}
    </Box>
  );
};

export default React.memo(TaskActions);
