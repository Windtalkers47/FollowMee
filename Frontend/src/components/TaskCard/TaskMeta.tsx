import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { format, formatDistanceToNow } from 'date-fns';
import { Task } from '../../api/task.api';
import SmartAvatar from '../SmartAvatar';

interface TaskMetaProps {
  task: Task;
}

const TaskMeta: React.FC<TaskMetaProps> = ({ task }) => {
  const theme = useTheme();

  const glassBadgeStyle = {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(255, 255, 255, 0.7)',
    padding: '2px 8px',
    borderRadius: 8,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    fontSize: '0.7rem',
  };

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
      {/* Due Date / Date Range */}
      {(task.startDate && task.endDate) ? (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          fontWeight="500"
          sx={{
            ...glassBadgeStyle,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          📅 {format(new Date(task.startDate), 'MMM dd')} - {format(new Date(task.endDate), 'MMM dd')}
        </Typography>
      ) : task.dueDate ? (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          fontWeight="500"
          sx={{
            ...glassBadgeStyle,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          ⏰ Due {format(new Date(task.dueDate), 'MMM dd')}
        </Typography>
      ) : null}

      {/* Assigned To */}
      {task.assignedToUser && (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography 
            variant="caption" 
            color="text.secondary" 
            fontWeight="500"
            sx={glassBadgeStyle}
          >
            Assigned to
          </Typography>
          <SmartAvatar
            user={task.assignedToUser}
            avatarVariant="glass"
            size={16}
            sx={{
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'rgba(255, 255, 255, 0.8)'}`,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 2px 6px rgba(0, 0, 0, 0.3)'
                : '0 2px 6px rgba(31, 38, 135, 0.2)',
            }}
          />
          <Typography 
            variant="caption" 
            color="text.secondary" 
            fontWeight="500"
            sx={glassBadgeStyle}
          >
            {task.assignedToUser.userName}
          </Typography>
        </Stack>
      )}

      <Box flex={1} />

      {/* Time Ago */}
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={glassBadgeStyle}
      >
        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
      </Typography>
    </Stack>
  );
};

export default React.memo(TaskMeta);
