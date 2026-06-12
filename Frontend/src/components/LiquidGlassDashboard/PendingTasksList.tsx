import React from 'react';
import { Box, Typography, Chip, SxProps, Theme, IconButton } from '@mui/material';
import { LiquidGlassCard } from './LiquidGlassCard';
import { PendingTask } from '../../services/api/dashboardApi';
import { GradientPresetKey } from '../../styles/liquidGlassStyles';
import { AccessTime, CheckCircle, ArrowForward } from '@mui/icons-material';

interface PendingTasksListProps {
  tasks: PendingTask[];
  gradientPreset?: GradientPresetKey;
  isDarkMode?: boolean;
  sx?: SxProps<Theme>;
  onTaskClick?: (taskId: string) => void;
}

const statusColors: Record<string, string> = {
  todo: '#FFC107',
  in_progress: '#2196F3',
  review: '#9C27B0',
  done: '#4CAF50',
  cancelled: '#F44336',
};

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const PendingTasksList: React.FC<PendingTasksListProps> = ({
  tasks,
  gradientPreset = 'freshGreen',
  isDarkMode = false,
  sx = {},
  onTaskClick,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return priority;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  return (
    <LiquidGlassCard
      gradientPreset={gradientPreset}
      isDarkMode={isDarkMode}
      sx={{
        p: 3,
        ...sx,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          ⏳ Pending Tasks
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          }}
        >
          {tasks.length} tasks
        </Typography>
      </Box>

      {tasks.length === 0 ? (
        <Box
          textAlign="center"
          py={4}
          sx={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
        >
          <CheckCircle sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="body1">All caught up!</Typography>
          <Typography variant="caption">No pending tasks</Typography>
        </Box>
      ) : (
        <Box>
          {tasks.map((task, index) => (
            <Box
              key={task.taskId}
              display="flex"
              alignItems="center"
              mb={index < tasks.length - 1 ? 2 : 0}
              p={2}
              sx={{
                borderRadius: 2,
                background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${
                  task.priority === 'high'
                    ? 'rgba(244, 67, 54, 0.3)'
                    : isDarkMode
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)'
                }`,
                transition: 'all 0.3s ease',
                cursor: onTaskClick ? 'pointer' : 'default',
                '&:hover': {
                  background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  transform: onTaskClick ? 'translateX(4px)' : 'none',
                  borderColor: task.priority === 'high' ? 'rgba(244, 67, 54, 0.5)' : undefined,
                },
              }}
              onClick={() => onTaskClick?.(task.taskId)}
            >
              <Box
                sx={{
                  width: 4,
                  height: '100%',
                  minHeight: 40,
                  borderRadius: 2,
                  mr: 2,
                  bgcolor: getPriorityColor(task.priority),
                }}
              />
              <Box flex={1} minWidth={0}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: isDarkMode ? '#fff' : '#1a1a1a',
                    mb: 0.5,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {task.title}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={statusLabels[task.status] || task.status}
                    size="small"
                    sx={{
                      bgcolor: `${statusColors[task.status]}20`,
                      color: statusColors[task.status],
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      border: `1px solid ${statusColors[task.status]}`,
                    }}
                  />
                  <Chip
                    label={getPriorityLabel(task.priority)}
                    size="small"
                    sx={{
                      bgcolor: `${getPriorityColor(task.priority)}20`,
                      color: getPriorityColor(task.priority),
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      border: `1px solid ${getPriorityColor(task.priority)}`,
                    }}
                  />
                  {task.dueDate && (
                    <Box display="flex" alignItems="center" sx={{ ml: 1 }}>
                      <AccessTime
                        sx={{
                          fontSize: 14,
                          mr: 0.5,
                          color:
                            formatDate(task.dueDate).includes('Overdue')
                              ? '#F44336'
                              : isDarkMode
                              ? 'rgba(255,255,255,0.5)'
                              : 'rgba(0,0,0,0.5)',
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            formatDate(task.dueDate).includes('Overdue')
                              ? '#F44336'
                              : isDarkMode
                              ? 'rgba(255,255,255,0.5)'
                              : 'rgba(0,0,0,0.5)',
                        }}
                      >
                        {formatDate(task.dueDate)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              {onTaskClick && (
                <IconButton size="small" sx={{ ml: 1 }}>
                  <ArrowForward
                    sx={{
                      color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    }}
                  />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      )}
    </LiquidGlassCard>
  );
};

export default PendingTasksList;