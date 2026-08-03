import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { Task } from '../../api/task.api';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { gradientPresets } from '../../styles/liquidGlassStyles';
import SmartAvatar from '../SmartAvatar';

const statusColors: Record<Task['status'], 'default' | 'primary' | 'warning' | 'success'> = {
  draft: 'default',
  todo: 'primary',
  in_progress: 'warning',
  review: 'warning',
  done: 'success', // Using Fresh Green (#10b981) theme
  cancelled: 'default',
} as const;

const statusLabels: Record<Task['status'], string> = {
  draft: 'Draft',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  cancelled: 'Cancelled',
} as const;

interface TaskHeaderProps {
  task: Task;
  showActions: boolean;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  showActions,
  onMenuOpen,
}) => {
  const theme = useTheme();
  const { liquidGlassSettings } = useLiquidGlass();
  
  // Get gradient preset for status chip
  const preset = gradientPresets[liquidGlassSettings.gradientPreset];

  return (
    <Box sx={{ 
      p: 1.5, 
      pb: 0.5,
      background: 'transparent'
    }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        {/* Glass Avatar */}
        <SmartAvatar
          user={task.createdByUser}
          size={32}
          avatarVariant="glass"
          sx={{
            border: `2px solid ${theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(255, 255, 255, 0.8)'}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(0, 0, 0, 0.4)'
              : '0 4px 12px rgba(31, 38, 135, 0.2)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        />
        
        {/* Glass Content */}
        <Box flex={1} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography 
              variant="body2" 
              fontWeight="600" 
              noWrap
              sx={{
                color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.8)',
                textShadow: theme.palette.mode === 'dark' 
                  ? '0 1px 2px rgba(0, 0, 0, 0.3)' 
                  : '0 1px 2px rgba(255, 255, 255, 0.5)',
              }}
            >
              {task.createdByUser?.userName} {task.createdByUser?.userLastName}
            </Typography>
            <Chip
              label={statusLabels[task.status]}
              color={statusColors[task.status]}
              size="small"
              sx={{ 
                fontSize: '0.65rem', 
                height: 18,
                fontWeight: 600,
                // Use gradient preset for status chip background
                background: task.status === 'done'
                  ? preset.light  // Use gradient preset for Done status
                  : task.status === 'in_progress'
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(251, 191, 36, 0.8))'
                    : task.status === 'review'
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(147, 197, 253, 0.8))'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(255, 255, 255, 0.9)',
                color: task.status === 'done' || task.status === 'in_progress' || task.status === 'review'
                  ? '#ffffff'
                  : theme.palette.mode === 'dark'
                    ? '#ffffff'
                    : 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                border: task.status === 'done'
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : task.status === 'in_progress'
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : task.status === 'review'
                      ? '1px solid rgba(59, 130, 246, 0.4)'
                      : theme.palette.mode === 'dark' 
                        ? '1px solid rgba(255, 255, 255, 0.25)' 
                        : '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: task.status === 'done' || task.status === 'in_progress' || task.status === 'review'
                  ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                  : '0 2px 6px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'scale(1.05)',
                }
              }}
            />
          </Stack>
          
          <Typography 
            variant="subtitle1" 
            fontWeight="600" 
            sx={{ 
              fontSize: '1rem', 
              lineHeight: 1.3, 
              mb: 0.5,
              color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.9)',
              textShadow: theme.palette.mode === 'dark' 
                ? '0 2px 4px rgba(0, 0, 0, 0.4)' 
                : '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            {task.title}
          </Typography>
          
          {task.description && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
                fontSize: '0.875rem',
                color: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.7)' 
                  : 'rgba(0, 0, 0, 0.6)',
              }}
            >
              {task.description}
            </Typography>
          )}
        </Box>

        {/* Glass Menu with Liquid Effect */}
        {showActions && (
          <IconButton 
            size="small" 
            onClick={onMenuOpen} 
            sx={{ 
              p: 0.5,
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(10px) saturate(180%)',
              WebkitBackdropFilter: 'blur(10px) saturate(180%)',
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.2)' 
                : 'rgba(255, 255, 255, 0.4)'}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <MoreVertIcon fontSize="small" sx={{ 
              color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)'
            }} />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
};

export default React.memo(TaskHeader);
