import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../store/store';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Collapse,
  Divider,
  useTheme,
  Stack,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ThumbUp as LikeIcon,
  Favorite as LoveIcon,
  SentimentVerySatisfied as LaughIcon,
  MoodBad as AngryIcon,
  ThumbDown as DislikeIcon,
  Comment as CommentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as DoneIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { Task, TaskLikeSummary, commentApi } from '../../src/api/task.api';
import { CommentTree } from './comments';
import { useComments } from '../hooks/useComments';

interface TaskCardProps {
  task: Task;
  likeSummary?: TaskLikeSummary;
  currentUserId: number;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'dislike') => void;
  onUnlike?: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onMarkDone?: (taskId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  // Liquid Glass UI Controls
  glassOpacity?: number; // 0.1 to 1.0 (higher = less transparent)
  showBorders?: boolean; // toggle borders on/off
  blurIntensity?: number; // 0 to 40px blur
  glassStyle?: 'subtle' | 'medium' | 'bold'; // preset styles
}

const statusColors: Record<Task['status'], 'default' | 'primary' | 'warning' | 'success'> = {
  draft: 'default',
  upcoming: 'primary',
  past: 'warning',
  done: 'success',
} as const;

const statusLabels: Record<Task['status'], string> = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  past: 'Past Due',
  done: 'Done',
} as const;

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  likeSummary,
  currentUserId,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
  onComment,
  onMarkDone,
  showActions = true,
  compact = false,
  // Liquid Glass UI Controls with defaults
  glassOpacity = 0.7,
  showBorders = true,
  blurIntensity = 20,
  glassStyle = 'medium',
}) => {
  const theme = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

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

  // Use new optimized comments hook
  const { commentTree, isLoading: commentsLoading, refetch: commentsRefetch } = useComments({ 
    taskId: task.taskId, 
    enabled: showComments 
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const canEdit = task.createdBy === currentUserId;
  const canDelete = task.createdBy === currentUserId;
  const canUpdateStatus = task.assignedTo === currentUserId || task.createdBy === currentUserId;

  // Calculate engagement metrics
  const totalEngagement = (likeSummary?.total || 0) + (task._count?.comments || 0);
  const isLiked = likeSummary?.userLike === 'like';
  const isLoved = likeSummary?.userLike === 'love';
  const isLaughed = likeSummary?.userLike === 'laugh';
  const isAngry = likeSummary?.userLike === 'angry';
  const isDisliked = likeSummary?.userLike === 'dislike';

  return (
    <>
      <Card
        sx={{
          mb: 1.5,
          maxWidth: compact ? '100%' : 500,
          mx: compact ? 0 : 'auto',
          borderRadius: 3,
          background: theme.palette.mode === 'dark' 
            ? `rgba(255, 255, 255, ${finalOpacity * 0.12})`
            : `rgba(255, 255, 255, ${finalOpacity})`,
          backdropFilter: `blur(${finalBlur}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${finalBlur}px) saturate(180%)`,
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
        <Box sx={{ 
          p: 1.5, 
          pb: 0.5,
          background: 'transparent'
        }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            {/* Glass Avatar */}
            <Avatar
              src={task.createdByUser?.userImageUrl}
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
              {task.createdByUser?.userName?.[0]}
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
                    background: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'rgba(255, 255, 255, 0.7)'}`,
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
                onClick={handleMenuOpen} 
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

        {/* Glass Task Image */}
        {task.imageUrl && (
          <Box
            sx={{
              position: 'relative',
              cursor: 'pointer',
              '&:hover .overlay': {
                opacity: 1,
              }
            }}
            onClick={() => setShowImagePreview(true)}
          >
            <Box
              component="img"
              src={task.imageUrl}
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
                View
              </Typography>
            </Box>
          </Box>
        )}

        {/* Glass Metadata & Actions */}
        <Box sx={{ 
          px: 1.5, 
          py: 1,
          background: 'transparent'
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            {/* Due Date */}
            {task.dueDate && (
              <Typography 
                variant="caption" 
                color="text.secondary" 
                fontWeight="500"
                sx={{
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(255, 255, 255, 0.7)',
                  padding: '2px 8px',
                  borderRadius: 8,
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  fontSize: '0.7rem',
                }}
              >
                Due {format(new Date(task.dueDate), 'MMM dd')}
              </Typography>
            )}

            {/* Assigned To */}
            {task.assignedToUser && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  fontWeight="500"
                  sx={{
                    background: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(255, 255, 255, 0.7)',
                    padding: '2px 8px',
                    borderRadius: 8,
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    fontSize: '0.7rem',
                  }}
                >
                  Assigned to
                </Typography>
                <Avatar
                  src={task.assignedToUser.userImageUrl}
                  sx={{ 
                    width: 16, 
                    height: 16,
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(255, 255, 255, 0.8)'}`,
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 2px 6px rgba(0, 0, 0, 0.3)'
                      : '0 2px 6px rgba(31, 38, 135, 0.2)',
                  }}
                >
                  {task.assignedToUser.userName?.[0]}
                </Avatar>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  fontWeight="500"
                  sx={{
                    background: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(255, 255, 255, 0.7)',
                    padding: '2px 8px',
                    borderRadius: 8,
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    fontSize: '0.7rem',
                  }}
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
              sx={{
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(255, 255, 255, 0.7)',
                padding: '2px 8px',
                borderRadius: 8,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                fontSize: '0.7rem',
              }}
            >
              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </Typography>
          </Stack>

          {/* Glass Engagement Bar */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {/* Like Button */}
            <IconButton
              size="small"
              onClick={() => isLiked ? onUnlike?.(task.taskId) : onLike?.(task.taskId, 'like')}
              color={isLiked ? 'primary' : 'default'}
              sx={{ 
                p: 0.5,
                background: isLiked 
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(25, 118, 210, 0.2)'
                    : 'rgba(25, 118, 210, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(25, 118, 210, 0.3)' 
                  : 'rgba(25, 118, 210, 0.4)'}`,
                '&:hover': {
                  background: isLiked 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(25, 118, 210, 0.3)'
                      : 'rgba(25, 118, 210, 0.25)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.8)',
                }
              }}
            >
              <LikeIcon fontSize="small" />
            </IconButton>

            {/* Love Button */}
            <IconButton
              size="small"
              onClick={() => isLoved ? onUnlike?.(task.taskId) : onLike?.(task.taskId, 'love')}
              color={isLoved ? 'error' : 'default'}
              sx={{ 
                p: 0.5,
                background: isLoved 
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(239, 68, 68, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : 'rgba(239, 68, 68, 0.4)'}`,
                '&:hover': {
                  background: isLoved 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(239, 68, 68, 0.25)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.8)',
                }
              }}
            >
              <LoveIcon fontSize="small" />
            </IconButton>

            {/* Laugh Button */}
            <IconButton
              size="small"
              onClick={() => isLaughed ? onUnlike?.(task.taskId) : onLike?.(task.taskId, 'laugh')}
              color={isLaughed ? 'warning' : 'default'}
              sx={{ 
                p: 0.5,
                background: isLaughed 
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(245, 158, 11, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(245, 158, 11, 0.3)' 
                  : 'rgba(245, 158, 11, 0.4)'}`,
                '&:hover': {
                  background: isLaughed 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(245, 158, 11, 0.25)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.8)',
                }
              }}
            >
              <LaughIcon fontSize="small" />
            </IconButton>

            {/* Angry Button */}
            <IconButton
              size="small"
              onClick={() => isAngry ? onUnlike?.(task.taskId) : onLike?.(task.taskId, 'angry')}
              color={isAngry ? 'error' : 'default'}
              sx={{ 
                p: 0.5,
                background: isAngry 
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(220, 38, 38, 0.2)'
                    : 'rgba(220, 38, 38, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(220, 38, 38, 0.3)' 
                  : 'rgba(220, 38, 38, 0.4)'}`,
                '&:hover': {
                  background: isAngry 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(220, 38, 38, 0.3)'
                      : 'rgba(220, 38, 38, 0.25)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.8)',
                }
              }}
            >
              <AngryIcon fontSize="small" />
            </IconButton>

            {/* Dislike Button */}
            <IconButton
              size="small"
              onClick={() => isDisliked ? onUnlike?.(task.taskId) : onLike?.(task.taskId, 'dislike')}
              color={isDisliked ? 'default' : 'default'}
              sx={{ 
                p: 0.5,
                background: isDisliked 
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(158, 158, 158, 0.2)'
                    : 'rgba(158, 158, 158, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(158, 158, 158, 0.3)' 
                  : 'rgba(158, 158, 158, 0.4)'}`,
                '&:hover': {
                  background: isDisliked 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(158, 158, 158, 0.3)'
                      : 'rgba(158, 158, 158, 0.25)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.8)',
                }
              }}
            >
              <DislikeIcon fontSize="small" />
            </IconButton>

            {/* Comment Button */}
            <IconButton
              size="small"
              onClick={() => setShowComments(!showComments)}
              sx={{
                p: 0.5,
                background: showComments 
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(66, 66, 66, 0.2)'
                    : 'rgba(66, 66, 66, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(66, 66, 66, 0.3)' 
                  : 'rgba(66, 66, 66, 0.4)'}`,
                '&:hover': {
                  background: showComments 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(66, 66, 66, 0.3)'
                      : 'rgba(66, 66, 66, 0.25)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.8)',
                }
              }}
            >
              <CommentIcon fontSize="small" />
            </IconButton>

            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                ml: 0.5,
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(255, 255, 255, 0.7)',
                padding: '2px 6px',
                borderRadius: 6,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                fontSize: '0.7rem',
              }}
            >
              {totalEngagement > 0 && `${totalEngagement}`}
            </Typography>

            <Box flex={1} />

            {/* Glass Mark Done Button */}
            {canUpdateStatus && task.status !== 'done' && (
              <Button
                size="small"
                startIcon={<DoneIcon />}
                onClick={() => onMarkDone?.(task.taskId)}
                variant="contained"
                color="success"
                sx={{
                  borderRadius: 15,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 6px 16px rgba(16, 185, 129, 0.5)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Done
              </Button>
            )}

            {/* Action Menu */}
            {showActions && (canEdit || canDelete) && (
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    background: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'rgba(255, 255, 255, 0.3)'}`,
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                      : '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
                  }
                }}
              >
                {canEdit && (
                  <MenuItem onClick={() => { onEdit?.(task); handleMenuClose(); }}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Edit
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem onClick={() => { setConfirmDelete(true); handleMenuClose(); }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Delete
                  </MenuItem>
                )}
              </Menu>
            )}
          </Stack>
        </Box>

        {/* Comments Section */}
        <Collapse in={showComments}>
          <Divider />
          <Box p={2}>
            {commentTree && (
              <CommentTree
                taskId={task.taskId}
                maxDepth={3}
              />
            )}
          </Box>
        </Collapse>
      </Card>

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
                maxHeight: 500,
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImagePreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{task.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onDelete?.(task.taskId);
              setConfirmDelete(false);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskCard;
