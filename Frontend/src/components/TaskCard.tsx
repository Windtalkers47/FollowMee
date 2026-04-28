import React, { useState, useMemo } from 'react';
import {
  Card,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Task, TaskLikeSummary } from '../../src/api/task.api';
import { useComments } from '../hooks/useComments';
import { getTaskPermissions, TaskPermissions } from '../permissions/taskPermissions';
import TaskHeader from './TaskCard/TaskHeader';
import TaskImage from './TaskCard/TaskImage';
import TaskMeta from './TaskCard/TaskMeta';
import TaskReactions from './TaskCard/TaskReactions';
import TaskActions from './TaskCard/TaskActions';
import TaskSwipeAction from './TaskCard/TaskSwipeAction';
import TaskMenu from './TaskCard/TaskMenu';
import CommentSection from './TaskCard/CommentSection';

interface TaskCardProps {
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
  // Liquid Glass UI Controls
  glassOpacity?: number; // 0.1 to 1.0 (higher = less transparent)
  showBorders?: boolean; // toggle borders on/off
  blurIntensity?: number; // 0 to 40px blur
  glassStyle?: 'subtle' | 'medium' | 'bold'; // preset styles
}


const TaskCard: React.FC<TaskCardProps> = ({
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
  // Liquid Glass UI Controls with defaults
  glassOpacity = 0.7,
  showBorders = true,
  blurIntensity = 20,
  glassStyle = 'medium',
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Liquid Glass UI Style Presets
  const glassPresets = {
    subtle: { opacity: 0.5, blur: 12, borderOpacity: 0.2 },
    medium: { opacity: 0.7, blur: 20, borderOpacity: 0.3 },
    bold: { opacity: 0.85, blur: 30, borderOpacity: 0.5 }
  };

  const currentPreset = glassPresets[glassStyle];
  const finalOpacity = glassOpacity || currentPreset.opacity;
  const finalBlur = blurIntensity || currentPreset.blur;
  const finalBorderOpacity = showBorders ? (glassOpacity || currentPreset.borderOpacity) : 0;
  
  // Disable blur on mobile for better performance
  const enableBlur = !isMobile;
  const backdropFilterValue = enableBlur ? `blur(${finalBlur}px) saturate(180%)` : 'none';

  // Use comments hook for comment functionality - only enabled when comments are shown
  useComments({ 
    taskId: task.taskId, 
    enabled: showComments 
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCommentToggle = () => {
    setShowComments(!showComments);
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
      <Card
        sx={{
          mb: 1.5,
          // maxWidth: compact ? '100%' : 700, ปรับขนาด TaskCard
          maxWidth: '100%',
          mx: compact ? 0 : 'auto',
          borderRadius: 3,
          background: theme.palette.mode === 'dark' 
            ? `rgba(255, 255, 255, ${finalOpacity * 0.12})`
            : `rgba(255, 255, 255, ${finalOpacity})`,
          backdropFilter: backdropFilterValue,
          WebkitBackdropFilter: backdropFilterValue,
          border: showBorders ? `1px solid ${theme.palette.mode === 'dark' 
            ? `rgba(255, 255, 255, ${finalBorderOpacity * 0.15})` 
            : `rgba(255, 255, 255, ${finalBorderOpacity * 0.3})`}` : 'none',
          boxShadow: theme.palette.mode === 'dark'
            ? `0 8px 32px 0 rgba(0, 0, 0, ${0.37 * finalOpacity}), 0 2px 8px 0 rgba(0, 0, 0, ${0.2 * finalOpacity}), inset 0 1px 0 0 rgba(255, 255, 255, ${0.1 * finalOpacity})`
            : `0 8px 32px 0 rgba(31, 38, 135, ${0.15 * finalOpacity}), 0 2px 8px 0 rgba(31, 38, 135, ${0.1 * finalOpacity}), inset 0 1px 0 0 rgba(255, 255, 255, ${0.5 * finalOpacity})`,
          overflow: 'visible',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px) scale(1.02)',
            boxShadow: theme.palette.mode === 'dark'
              ? `0 12px 40px 0 rgba(0, 0, 0, ${0.45 * finalOpacity}), 0 4px 12px 0 rgba(0, 0, 0, ${0.25 * finalOpacity}), inset 0 1px 0 0 rgba(255, 255, 255, ${0.15 * finalOpacity})`
              : `0 12px 40px 0 rgba(31, 38, 135, ${0.2 * finalOpacity}), 0 4px 12px 0 rgba(31, 38, 135, ${0.15 * finalOpacity}), inset 0 1px 0 0 rgba(255, 255, 255, ${0.6 * finalOpacity})`,
          }
        }}
      >
        {/* Glass Header */}
        <TaskHeader
          task={task}
          showActions={showActions}
          onMenuOpen={handleMenuOpen}
        />

        {/* Glass Task Image */}
        <TaskImage
          task={task}
          onImageClick={() => setShowImagePreview(true)}
        />

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
          <TaskActions
            task={task}
            permissions={permissions}
            onMarkDone={onMarkDone}
            onMarkUndone={onMarkUndone}
            onApproveTask={onApproveTask}
          />
        </Box>
      </Card>

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

      {/* Image Preview Dialog */}
      <Dialog 
        open={showImagePreview} 
        onClose={() => setShowImagePreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{task.title}</DialogTitle>
        <DialogContent>
          {task.imageUrl && (
            <Box
              component="img"
              src={task.imageUrl}
              alt={task.title}
              sx={{
                width: '100%',
                height: 'auto',
                borderRadius: 2,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImagePreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const TaskCardMemo = TaskCard;

export default React.memo(TaskCardMemo);
