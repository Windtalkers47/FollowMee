import React from 'react';
import { Box, Typography, SxProps, Theme } from '@mui/material';
import { LiquidGlassCard } from './LiquidGlassCard';
import { PendingTask } from '../../services/api/dashboardApi';
import { GradientPresetKey } from '../../styles/liquidGlassStyles';
import { AccessTime, CheckCircle, ArrowForward, Flag } from '@mui/icons-material';
import { brandColors } from '../../styles/designTokens';

interface PendingTasksListProps {
  tasks: PendingTask[];
  gradientPreset?: GradientPresetKey;
  isDarkMode?: boolean;
  sx?: SxProps<Theme>;
  onTaskClick?: (taskId: string) => void;
}

const statusColors: Record<string, string> = {
  todo: brandColors.amber,
  in_progress: brandColors.blue,
  review: brandColors.indigo,
  done: brandColors.iosGreen,
  cancelled: brandColors.red,
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
        return brandColors.red;
      case 'medium':
        return brandColors.amber;
      case 'low':
        return brandColors.iosGreen;
      default:
        return '#9E9E9E';
    }
  };

  const getPriorityGradient = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'linear-gradient(135deg, rgba(255, 59, 48, 0.16), rgba(255, 59, 48, 0.04))';
      case 'medium':
        return 'linear-gradient(135deg, rgba(255, 159, 10, 0.16), rgba(255, 159, 10, 0.04))';
      case 'low':
        return 'linear-gradient(135deg, rgba(52, 199, 89, 0.16), rgba(52, 199, 89, 0.04))';
      default:
        return isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
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

  const formatDate = (dateString?: string): { text: string; color: string } => {
    if (!dateString) return { text: '', color: '' };
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, color: brandColors.red };
    } else if (diffDays === 0) {
      return { text: 'Today', color: brandColors.amber };
    } else if (diffDays === 1) {
      return { text: 'Tomorrow', color: brandColors.blue };
    } else {
      return { text: `In ${diffDays}d`, color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' };
    }
  };

  return (
    <LiquidGlassCard
      gradientPreset={gradientPreset}
      isDarkMode={isDarkMode}
      sx={{
        p: { xs: 2, sm: 3 },
        ...sx,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <AccessTime sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#fff' : '#1a1a1a' }}>
            Pending Tasks
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            fontWeight: 600,
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
          <CheckCircle sx={{ fontSize: 48, mb: 2, opacity: 0.5, color: 'primary.main' }} />
          <Typography variant="body1" sx={{ fontWeight: 600, color: isDarkMode ? '#fff' : '#1a1a1a' }}>
            All caught up!
          </Typography>
          <Typography variant="caption">No pending tasks</Typography>
        </Box>
      ) : (
        <Box>
          {tasks.map((task, index) => {
            const dueDateInfo = formatDate(task.dueDate);
            return (
              <Box
                key={task.taskId}
                display="flex"
                alignItems="center"
                mb={index < tasks.length - 1 ? 2 : 0}
                p={2}
                sx={{
                  borderRadius: 3,
                  background: getPriorityGradient(task.priority),
                  border: `1px solid ${getPriorityColor(task.priority)}30`,
                  transition: 'all 0.3s ease',
                  cursor: onTaskClick ? 'pointer' : 'default',
                  '&:hover': {
                    transform: 'translateX(8px)',
                    borderColor: `${getPriorityColor(task.priority)}50`,
                    boxShadow: `0 8px 20px ${getPriorityColor(task.priority)}20`,
                  },
                }}
                onClick={() => onTaskClick?.(task.taskId)}
              >
                {/* Priority Bar */}
                <Box
                  sx={{
                    width: 4,
                    height: '100%',
                    minHeight: 48,
                    borderRadius: 2,
                    mr: 2,
                    background: `linear-gradient(180deg, ${getPriorityColor(task.priority)}, ${getPriorityColor(task.priority)}80)`,
                  }}
                />

                {/* Content */}
                <Box flex={1} minWidth={0}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: isDarkMode ? '#fff' : '#1a1a1a',
                      mb: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {task.title}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
                    {/* Status Badge */}
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        bgcolor: `${statusColors[task.status]}15`,
                        border: `1px solid ${statusColors[task.status]}40`,
                        color: statusColors[task.status],
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {statusLabels[task.status] || task.status}
                    </Box>

                    {/* Priority Badge */}
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        bgcolor: `${getPriorityColor(task.priority)}15`,
                        border: `1px solid ${getPriorityColor(task.priority)}40`,
                        color: getPriorityColor(task.priority),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      <Flag sx={{ fontSize: 12 }} />
                      {getPriorityLabel(task.priority)}
                    </Box>

                    {/* Due Date */}
                    {task.dueDate && (
                      <Box
                        display="flex"
                        alignItems="center"
                        sx={{
                          ml: 0.5,
                          px: 1,
                          py: 0.3,
                          borderRadius: 1.5,
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        }}
                      >
                        <AccessTime
                          sx={{
                            fontSize: 12,
                            mr: 0.3,
                            color: dueDateInfo.color,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: dueDateInfo.color,
                            fontWeight: 500,
                            fontSize: '0.7rem',
                          }}
                        >
                          {dueDateInfo.text}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Arrow Icon */}
                {onTaskClick && (
                  <Box
                    sx={{
                      ml: 1,
                      color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                      transition: 'transform 0.3s ease',
                    }}
                  >
                    <ArrowForward sx={{ fontSize: 18 }} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </LiquidGlassCard>
  );
};

export default PendingTasksList;
