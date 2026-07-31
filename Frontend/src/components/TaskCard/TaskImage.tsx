import React from 'react';
import { Box, Typography } from '@mui/material';
import { Task } from '../../api/task.api';
import { getResponsiveImageProps } from '../../utils/imageUtils';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface TaskImageProps {
  task: Task;
  onImageClick: () => void;
}

const TaskImage: React.FC<TaskImageProps> = ({ task, onImageClick }) => {
  const { t } = useUserPreferences();

  if (!task.imageUrl) return null;

  return (
    <Box
      sx={{
        position: 'relative',
        cursor: 'pointer',
        '&:hover .overlay': {
          opacity: 1,
        }
      }}
      onClick={onImageClick}
    >
      <Box
        component="img"
        {...getResponsiveImageProps(task.imageUrl, '(max-width: 600px) 100vw, 640px')}
        alt={task.title}
        sx={{
          width: '100%',
          height: 150,
          objectFit: 'cover',
          borderRadius: 2,
        }}
      />
      <Box
        className="overlay"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: 2,
        }}
      >
        <Typography 
          color="white" 
          variant="caption" 
          fontWeight="600"
          sx={{
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '4px 12px',
            borderRadius: 12,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {t('task.view')}
        </Typography>
      </Box>
    </Box>
  );
};

export default React.memo(TaskImage);
