import React, { useRef } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';

interface TaskSwipeActionProps {
  taskId: string;
  onStartProgress?: (taskId: string) => void;
}

const TaskSwipeAction: React.FC<TaskSwipeActionProps> = ({
  taskId,
  onStartProgress,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const swipeRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 80;
    const isLeftSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && onStartProgress) {
      onStartProgress(taskId);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!onStartProgress) return null;

  return (
    <Box
      ref={swipeRef}
      sx={{
        mt: 1.5,
        mb: 1,
        p: 1,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.08))'
          : 'linear-gradient(90deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.08))',
        border: `1px dashed ${theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.4)' : 'rgba(33, 150, 243, 0.5)'}`,
        borderRadius: 2,
        cursor: isMobile ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y',
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        '&:hover': !isMobile ? {
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.25), rgba(33, 150, 243, 0.15))'
            : 'linear-gradient(90deg, rgba(33, 150, 243, 0.25), rgba(33, 150, 243, 0.15))',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.6)' : 'rgba(33, 150, 243, 0.7)',
          transform: 'translateX(4px)',
        } : {},
        '&::before': {
          content: isMobile ? '"Swipe right to start working  »"' : '"Click to start working  »"',
          color: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.9)' : 'rgba(33, 150, 243, 0.95)',
          fontSize: '0.75rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        },
        '&:active': !isMobile ? {
          transform: 'translateX(8px)',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.35), rgba(33, 150, 243, 0.25))'
            : 'linear-gradient(90deg, rgba(33, 150, 243, 0.35), rgba(33, 150, 243, 0.25))',
        } : {}
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={!isMobile ? () => onStartProgress(taskId) : undefined}
    />
  );
};

export default React.memo(TaskSwipeAction);
