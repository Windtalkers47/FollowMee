import React, { useState, useRef } from 'react';
import { useAppSelector } from '../store/store';
import Swal from 'sweetalert2';
import {
  Card,
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
  Button,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { Task, TaskLikeSummary } from '../../src/api/task.api';
import { CommentTree } from './comments';
import { useComments } from '../hooks/useComments';
import SmartAvatar from './SmartAvatar';

interface TaskCardProps {
  task: Task;
  likeSummary?: TaskLikeSummary;
  currentUserId: number;
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
  todo: 'primary',
  in_progress: 'warning',
  review: 'warning',
  done: 'success',
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
  onMarkUndone,
  onApproveTask,
  onStartProgress,
  onCancel,
  showActions = true,
  compact = false,
  // Liquid Glass UI Controls with defaults
  glassOpacity = 0.7,
  showBorders = true,
  blurIntensity = 20,
  glassStyle = 'medium',
}) => {
  const theme = useTheme();
  const { } = useAppSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  // Mobile swipe detection
  const swipeRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
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

  // Use comments hook for comment functionality - always enabled to prevent refetch issues
  useComments({ 
    taskId: task.taskId, 
    enabled: true 
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
  const canUndone = task.createdBy === currentUserId || task.assignedTo === currentUserId;
  const canStartProgress = task.assignedTo === currentUserId && task.status === 'todo';
  const canCancel = (task.createdBy === currentUserId || task.assignedTo === currentUserId) && 
    (task.status === 'draft' || task.status === 'todo' || task.status === 'in_progress');

  // Swipe handlers
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
    const isLeftSwipe = distance < -50; // Swipe right (negative distance)
    
    if (isLeftSwipe && canStartProgress && onStartProgress) {
      onStartProgress(task.taskId);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Calculate engagement metrics
  const totalReactions = likeSummary?.total || 0;
  const isLiked = likeSummary?.userLike === 'like';
  const isLoved = likeSummary?.userLike === 'love';
  const isLaughed = likeSummary?.userLike === 'laugh';
  const isAngry = likeSummary?.userLike === 'angry';
  const isWowed = likeSummary?.userLike === 'wow';
  const isSad = likeSummary?.userLike === 'sad';

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
            {/* Due Date / Date Range */}
            {(task.startDate && task.endDate) ? (
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                📅 {format(new Date(task.startDate), 'MMM dd')} - {format(new Date(task.endDate), 'MMM dd')}
              </Typography>
            ) : task.dueDate ? (
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                ⏰ Due {format(new Date(task.dueDate), 'MMM dd')}
              </Typography>
            ) : null}

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
                <SmartAvatar
                  user={task.assignedToUser}
                  avatarVariant="glass"
                  size={16}
                  sx={{
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(255, 255, 255, 0.8)'}`,
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 2px 6px rgba(0, 0, 0, 0.3)'
                      : '0 2px 6px rgba(31, 38, 135, 0.2)',
                  }}
                />
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
                    ? 'rgba(76, 175, 80, 0.2)'
                    : 'rgba(25, 118, 210, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(220, 38, 38, 0.12)'
                    : 'rgba(255, 255, 255, 0.08)',
                '&:hover': {
                  background: isLiked 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(76, 175, 80, 0.25)'
                      : 'rgba(25, 118, 210, 0.2)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(220, 38, 38, 0.15)'
                      : 'rgba(255, 255, 255, 0.12)',
                },
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${isLiked 
                  ? theme.palette.mode === 'dark' 
                    ? 'rgba(76, 175, 80, 0.3)' 
                    : 'rgba(25, 118, 210, 0.4)' 
                  : theme.palette.mode === 'dark' 
                    ? 'rgba(220, 38, 38, 0.2)' 
                    : 'rgba(255, 255, 255, 0.8)'}`,
              }}
            >
              <span>👍</span>
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
              <span>❤️</span>
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
              <span>😂</span>
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
              <span>😠</span>
            </IconButton>

            {/* Wow Button */}
            <IconButton
              size="small"
              onClick={() => isWowed ? onUnlike?.(task.taskId) : onLike?.(task.taskId, 'wow')}
              color={isWowed ? 'info' : 'default'}
              sx={{ 
                p: 0.5,
                background: isWowed 
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(59, 130, 246, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(59, 130, 246, 0.3)' 
                  : 'rgba(59, 130, 246, 0.4)'}`,
                '&:hover': {
                  background: isWowed 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(59, 130, 246, 0.3)'
                      : 'rgba(59, 130, 246, 0.25)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.8)',
                }
              }}
            >
              <span>😮</span>
            </IconButton>

            {/* Sad Button */}
            <IconButton
              size="small"
              onClick={() => isSad ? onUnlike?.(task.taskId) : onLike?.(task.taskId, 'sad')}
              color={isSad ? 'secondary' : 'default'}
              sx={{ 
                p: 0.5,
                background: isSad 
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(156, 163, 175, 0.2)'
                    : 'rgba(156, 163, 175, 0.15)'
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${theme.palette.mode === 'dark' 
                  ? 'rgba(156, 163, 175, 0.3)' 
                  : 'rgba(156, 163, 175, 0.4)'}`,
                '&:hover': {
                  background: isSad 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(156, 163, 175, 0.3)'
                      : 'rgba(156, 163, 175, 0.25)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.8)',
                }
              }}
            >
              <span>😢</span>
            </IconButton>

            {/* Glass Comment Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => {
                  console.log('Comment button clicked, current showComments:', showComments);
                  setShowComments(!showComments);
                }}
                sx={{
                  p: 0.5,
                  background: showComments 
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(66, 66, 66, 0.2)'
                      : 'rgba(66, 66, 66, 0.08)'
                    : theme.palette.mode === 'dark'
                      ? 'rgba(220, 38, 38, 0.12)'
                      : 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: `1px solid ${showComments 
                    ? theme.palette.mode === 'dark' 
                      ? 'rgba(66, 66, 66, 0.3)' 
                      : 'rgba(66, 66, 66, 0.4)' 
                    : theme.palette.mode === 'dark' 
                      ? 'rgba(220, 38, 38, 0.15)' 
                      : 'rgba(255, 255, 255, 0.8)'}`,
                  '&:hover': {
                    background: showComments 
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(66, 66, 66, 0.25)'
                        : 'rgba(66, 66, 66, 0.2)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(220, 38, 38, 0.15)'
                        : 'rgba(255, 255, 255, 0.12)',
                  },
                }}
              >
                <span>💬</span>
              </IconButton>
            </Box>
          </Stack>

          {/* Swipe to Start Progress - Only for todo tasks assigned to current user */}
          {canStartProgress && onStartProgress && (
            <Box
              ref={swipeRef}
              sx={{
                position: 'absolute',
                bottom: 60,
                left: 16,
                right: 16,
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
                '&:hover': !isMobile ? {
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.25), rgba(33, 150, 243, 0.15))'
                    : 'linear-gradient(90deg, rgba(33, 150, 243, 0.25), rgba(33, 150, 243, 0.15))',
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.6)' : 'rgba(33, 150, 243, 0.7)',
                  transform: 'translateX(4px)',
                } : {},
                '&::before': {
                  content: isMobile ? '"Swipe right to start working  »"' : '"Click to start working  »"',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.9)' : 'rgba(33, 150, 243, 0.95)',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
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
              onClick={!isMobile ? () => onStartProgress(task.taskId) : undefined}
            >
              <Box sx={{ height: 32 }} />
            </Box>
          )}

          {/* Glass Mark Done/Undone Buttons - Positioned at Bottom Right */}
          <Box sx={{ 
            position: 'absolute',
            bottom: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
            zIndex: 10
          }}>
            {/* For assignee: Mark as Review (instead of Done) */}
            {canUpdateStatus && task.status !== 'review' && task.status !== 'done' && (
              <Button
                size="small"
                startIcon={<span>×</span>}
                onClick={() => onMarkDone?.(task.taskId)}
                variant="contained"
                color="primary"
                sx={{
                  borderRadius: 15,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.5)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Submit for Review
              </Button>
            )}

            {/* For creator: Approve task from Review to Done */}
            {task.createdBy === currentUserId && task.status === 'review' && (
              <Button
                size="small"
                startIcon={<span>×</span>}
                onClick={() => onApproveTask?.(task.taskId)}
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
                Approve
              </Button>
            )}

            {/* For creator: Reject task from Review to To Do */}
            {task.createdBy === currentUserId && task.status === 'review' && (
              <Button
                size="small"
                startIcon={<span>×</span>}
                onClick={() => onMarkUndone?.(task.taskId)}
                variant="contained"
                color="warning"
                sx={{
                  borderRadius: 15,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    boxShadow: '0 6px 16px rgba(245, 158, 11, 0.5)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Reject
              </Button>
            )}

            {/* For undo completed tasks */}
            {canUndone && task.status === 'done' && (
              <Button
                size="small"
                startIcon={<span>×</span>}
                onClick={() => onMarkUndone?.(task.taskId)}
                variant="contained"
                color="warning"
                sx={{
                  borderRadius: 15,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    boxShadow: '0 6px 16px rgba(245, 158, 11, 0.5)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Undo
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canEdit && (
          <MenuItem onClick={() => {
            onEdit?.(task);
            handleMenuClose();
          }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {canUpdateStatus && task.status !== 'done' && (
          <MenuItem onClick={() => {
            onMarkDone?.(task.taskId);
            handleMenuClose();
          }}>
            Mark Done
          </MenuItem>
        )}
        {canUndone && task.status === 'done' && (
          <MenuItem onClick={() => {
            onMarkUndone?.(task.taskId);
            handleMenuClose();
          }}>
            Mark Undone
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => {
            Swal.fire({
              title: 'Are you sure?',
              text: 'You won\'t be able to revert this task!',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#d33',
              cancelButtonColor: '#6c757d',
              confirmButtonText: 'Yes, delete it!',
              cancelButtonText: 'Cancel',
              reverseButtons: true
            }).then((result) => {
              if (result.isConfirmed) {
                onDelete?.(task.taskId);
              }
            });
            handleMenuClose();
          }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Comments Section */}
      {showComments && (
        <Box sx={{ mt: 2 }}>
          <CommentTree 
            taskId={task.taskId}
          />
        </Box>
      )}

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

export default TaskCard;
