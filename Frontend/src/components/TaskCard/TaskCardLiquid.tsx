import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, useTheme, useMediaQuery, Typography } from '@mui/material';
import { Task, TaskLikeSummary, TaskImage as TaskImageType } from '../../api/task.api';
import { getTaskPermissions, TaskPermissions } from '../../permissions/taskPermissions';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { gradientPresets } from '../../styles/liquidGlassStyles';
import TaskHeader from './TaskHeader';
import TaskImageCarousel from './TaskImageCarousel';
import TaskMeta from './TaskMeta';
import TaskReactions from './TaskReactions';
import TaskActions from './TaskActions';
import TaskSwipeAction from './TaskSwipeAction';
import TaskMenu from './TaskMenu';
import CommentSection from './CommentSection';

interface TaskCardLiquidProps {
  task: Task;
  likeSummary?: TaskLikeSummary;
  currentUserId: number;
  permissions?: TaskPermissions;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => void;
  onUnlike?: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onMarkDone?: (taskId: string) => void;
  onMarkUndone?: (taskId: string) => void;
  onApproveTask?: (taskId: string) => void;
  onStartProgress?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void;
  showActions?: boolean;
  compact?: boolean;
  showWorkflowActions?: boolean;
}

const TaskCardLiquid: React.FC<TaskCardLiquidProps> = ({
  task,
  likeSummary,
  currentUserId,
  permissions: propPermissions,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
  onComment,
  onMarkDone,
  onMarkUndone,
  onApproveTask,
  onStartProgress,
  onCancel,
  onUpdateTaskStatus,
  showActions = true,
  compact = false,
  showWorkflowActions = true,
}) => {
  const theme = useTheme();
  const location = useLocation();
  const { isLiquidGlassEnabled, liquidGlassSettings } = useLiquidGlass();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (location.pathname.endsWith(`/posts/${task.taskId}`) || location.pathname.endsWith(`/${task.taskId}`)) {
      setShowComments(true);
    }
  }, [location.pathname, task.taskId]);

  const handleCommentToggle = () => {
    setShowComments(!showComments);
  };

  // Extract images from task
  const taskImages: TaskImageType[] = useMemo(() => {
    if (task.images && task.images.length > 0) {
      return task.images;
    }
    if (task.imageUrl) {
      return [{ imageUrl: task.imageUrl, imageOrder: 0 } as TaskImageType];
    }
    return [];
  }, [task.images, task.imageUrl]);

  // Liquid Glass UI Style from context
  const preset = gradientPresets[liquidGlassSettings.gradientPreset];
  const gradient = theme.palette.mode === 'dark' ? preset.dark : preset.light;
  
  const bgOpacity = liquidGlassSettings.reduceTransparency ? 0.92 : 0.76;
  const blurStrength = liquidGlassSettings.reduceTransparency ? 0 : 8;
  
  const borderWidth = liquidGlassSettings.addBorders ? 1 : 0;
  const borderColor = liquidGlassSettings.increaseContrast 
    ? theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)'
    : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)';
  
  const shadowOpacity = liquidGlassSettings.increaseContrast ? 0.12 : 0.07;
  const backdropFilterValue = `blur(${blurStrength}px)`;

  // Use comments hook for comment functionality
  // useComments({ taskId: task.taskId, enabled: showComments });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleImageClick = (index: number) => {
    setPreviewImageIndex(index);
    setShowImagePreview(true);
  };

  // Use passed permissions or compute them if not provided (memoized for performance)
  const permissions = useMemo(() => 
    propPermissions || getTaskPermissions({
      userId: currentUserId,
      task,
    }),
    [currentUserId, task, propPermissions]
  );

  return (
    <>
      <Box
        data-task-id={task.taskId}
        sx={{
          mb: 2,
          maxWidth: '100%',
          mx: compact ? 0 : 'auto',
          borderRadius: 3,
          background: gradient,
          backdropFilter: backdropFilterValue,
          WebkitBackdropFilter: backdropFilterValue,
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow: `0 8px 22px rgba(0, 0, 0, ${shadowOpacity})`,
          overflow: 'visible',
          transition: 'box-shadow 180ms ease, border-color 180ms ease',
          '&:hover': {
            boxShadow: `0 10px 26px rgba(0, 0, 0, ${shadowOpacity + 0.04})`,
          }
        }}
      >
        {/* Glass Header */}
        <TaskHeader
          task={task}
          showActions={showActions}
          onMenuOpen={handleMenuOpen}
        />

        {/* Glass Task Image Carousel */}
        {taskImages.length > 0 && (
          <Box sx={{ px: 1.5, pb: 1 }}>
            <TaskImageCarousel
              images={taskImages}
              onImageClick={handleImageClick}
              glassOpacity={bgOpacity}
              showBorders={liquidGlassSettings.addBorders}
              blurIntensity={blurStrength}
              glassStyle={liquidGlassSettings.glassStyle}
            />
          </Box>
        )}

        {/* Glass Metadata & Actions */}
        <Box sx={{ 
          px: 1.5, 
          py: 1,
          background: 'transparent'
        }}>
          <TaskMeta task={task} />

          {/* Glass Engagement Bar */}
          <TaskReactions
            taskId={task.taskId}
            likeSummary={likeSummary}
            onLike={onLike}
            onUnlike={onUnlike}
            onCommentToggle={handleCommentToggle}
            showComments={showComments}
          />

          {/* Swipe to Start Progress - Only for todo tasks assigned to current user */}
          {permissions.canStart && onStartProgress && (
            <TaskSwipeAction
              taskId={task.taskId}
              onStartProgress={onStartProgress}
            />
          )}

          {/* Glass Mark Done/Undone Buttons - Positioned at Bottom Right */}
          {showWorkflowActions && (
            <TaskActions
              task={task}
              permissions={permissions}
              onMarkDone={onMarkDone}
              onMarkUndone={onMarkUndone}
              onApproveTask={onApproveTask}
            />
          )}
        </Box>
      </Box>

      {/* Menu */}
      <TaskMenu
        anchorEl={anchorEl}
        task={task}
        permissions={permissions}
        onMenuClose={handleMenuClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onCancel={onCancel}
        onUpdateTaskStatus={onUpdateTaskStatus}
      />

      {/* Comments Section */}
      <CommentSection
        taskId={task.taskId}
        showComments={showComments}
      />

      {/* Image Preview Dialog with Liquid Glass Style */}
      <Dialog 
        open={showImagePreview} 
        onClose={() => setShowImagePreview(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: gradient,
            backdropFilter: `blur(${blurStrength * 1.5}px) saturate(180%)`,
            WebkitBackdropFilter: `blur(${blurStrength * 1.5}px) saturate(180%)`,
            backgroundColor: theme.palette.mode === 'dark' 
              ? `rgba(30, 30, 40, 0.95)` 
              : `rgba(255, 255, 255, 0.95)`,
            borderRadius: 3,
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.5)'}`,
          }
        }}
      >
        <DialogTitle sx={{ 
          color: theme.palette.mode === 'dark' ? '#fff' : '#1a1a1a',
          fontWeight: 600,
        }}>
          {task.title}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {taskImages.length > 0 && (
            <Box
              component="img"
              src={taskImages[previewImageIndex]?.imageUrl}
              alt={task.title}
              sx={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 2,
              }}
            />
          )}
          {taskImages.length > 1 && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
              {taskImages.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setPreviewImageIndex(index)}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: index === previewImageIndex 
                      ? `2px solid ${preset.primary}`
                      : '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={taskImages[index].imageUrl}
                    alt={`Thumbnail ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          px: 2, 
          pb: 2,
          '& .MuiButton-root': {
            background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
            '&:hover': {
              background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            },
          }
        }}>
          <Button onClick={() => setShowImagePreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default React.memo(TaskCardLiquid);
