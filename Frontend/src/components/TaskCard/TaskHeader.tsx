import React from 'react';
import {
  Box,
  Avatar,
  Chip,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { Task } from '../../api/task.api';

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

  return (
    <Box sx={{ 
      p: 1.5, 
      pb: 0.5,
      background: 'transparent'
    }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        {/* Glass Avatar */}
        <Avatar
          src={task.createdByUser?.userImageUrl}
          imgProps={{ crossOrigin: 'anonymous' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target) target.src = '';
          }}
          sx={{
            width: 32,
            height: 32,
            border: `2px solid ${theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(255, 255, 255, 0.8)'}`,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 12px rgba(0, 0, 0, 0.4)'
              : '0 4px 12px rgba(31, 38, 135, 0.2)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {(!task.createdByUser?.userImageUrl || task.createdByUser.userImageUrl === '') && task.createdByUser?.userName?.[0]}
        </Avatar>
        
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
                fontWeight: 500,
                background: task.status === 'done'
                  ? '#10b981'  // Fresh Green for Done status
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.9)',
                color: task.status === 'done'
                  ? '#ffffff'
                  : theme.palette.mode === 'dark'
                    ? '#ffffff'
                    : 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: task.status === 'done'
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : theme.palette.mode === 'dark' 
                    ? '1px solid rgba(255, 255, 255, 0.2)' 
                    : '1px solid rgba(255, 255, 255, 0.7)',
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

        {/* Glass Menu */}
        {showActions && (
          <IconButton 
            size="small" 
            onClick={onMenuOpen} 
            sx={{ 
              p: 0.5,
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.15)' 
                : 'rgba(255, 255, 255, 0.3)'}`,
              '&:hover': {
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(255, 255, 255, 0.7)',
              }
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
};

export default React.memo(TaskHeader);
