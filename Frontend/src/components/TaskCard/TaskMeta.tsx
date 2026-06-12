import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { format, formatDistanceToNow } from 'date-fns';
import { Task } from '../../api/task.api';
import SmartAvatar from '../SmartAvatar';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { gradientPresets } from '../../styles/liquidGlassStyles';

interface TaskMetaProps {
  task: Task;
}

const TaskMeta: React.FC<TaskMetaProps> = ({ task }) => {
  const theme = useTheme();
  const { liquidGlassSettings } = useLiquidGlass();
  const preset = gradientPresets[liquidGlassSettings.gradientPreset];

  const glassBadgeStyle = {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(255, 255, 255, 0.75)',
    padding: '4px 10px',
    borderRadius: 12,
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
    fontSize: '0.75rem',
    fontWeight: 500,
    border: `1px solid ${theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(255, 255, 255, 0.5)'}`,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      background: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.18)'
        : 'rgba(255, 255, 255, 0.85)',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
    }
  };

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
      {/* Due Date / Date Range - Liquid Glass Badge */}
      {(task.startDate && task.endDate) ? (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          fontWeight="600"
          sx={{
            ...glassBadgeStyle,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            background: preset.light,
            color: theme.palette.mode === 'dark' ? '#fff' : '#1a1a1a',
          }}
        >
          📅 {format(new Date(task.startDate), 'MMM dd')} - {format(new Date(task.endDate), 'MMM dd')}
        </Typography>
      ) : task.dueDate ? (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          fontWeight="600"
          sx={{
            ...glassBadgeStyle,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            background: preset.light,
            color: theme.palette.mode === 'dark' ? '#fff' : '#1a1a1a',
          }}
        >
          ⏰ Due {format(new Date(task.dueDate), 'MMM dd')}
        </Typography>
      ) : null}

      {/* Assigned To - Liquid Glass Badge */}
      {task.assignedToUser && (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography 
            variant="caption" 
            color="text.secondary" 
            fontWeight="600"
            sx={{
              ...glassBadgeStyle,
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(255, 255, 255, 0.75)',
            }}
          >
            Assigned to
          </Typography>
          <SmartAvatar
            user={task.assignedToUser}
            avatarVariant="glass"
            size={20}
            sx={{
              width: 24,
              height: 24,
              border: `2px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.4)' 
                : 'rgba(255, 255, 255, 0.9)'}`,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 2px 8px rgba(0, 0, 0, 0.4)'
                : '0 2px 8px rgba(31, 38, 135, 0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <Typography 
            variant="caption" 
            color="text.secondary" 
            fontWeight="600"
            sx={{
              ...glassBadgeStyle,
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(255, 255, 255, 0.75)',
            }}
          >
            {task.assignedToUser.userName}
          </Typography>
        </Stack>
      )}

      <Box flex={1} />

      {/* Time Ago - Liquid Glass Badge */}
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{
          ...glassBadgeStyle,
          background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.6)',
        }}
      >
        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
      </Typography>
    </Stack>
  );
};

export default React.memo(TaskMeta);
