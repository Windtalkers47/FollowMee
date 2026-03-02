import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  TextField,
  Collapse,
  Divider,
  Zoom,
  Fade,
  Grow,
  useTheme,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ThumbUp as LikeIcon,
  Favorite as LoveIcon,
  SentimentVerySatisfied as LaughIcon,
  ThumbDown as AngryIcon,
  Comment as CommentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as DoneIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Task, TaskLikeSummary, commentApi } from '../../src/api/task.api';

interface TaskCardProps {
  task: Task;
  likeSummary?: TaskLikeSummary;
  currentUserId: number;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry') => void;
  onUnlike?: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onStatusUpdate?: (taskId: string, status: Task['status']) => void;
  showActions?: boolean;
  compact?: boolean;
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
  onStatusUpdate,
  showActions = true,
  compact = false,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commentReactions, setCommentReactions] = useState<Record<number, string>>({});

  // Fetch comments when comments section is opened
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['task-comments', task.taskId],
    queryFn: () => commentApi.getTaskComments(task.taskId),
    enabled: showComments, // Only fetch when comments are shown
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLike = (likeType: 'like' | 'love' | 'laugh' | 'angry') => {
    if (likeSummary?.userLike) {
      // If user already liked with the same type, remove it
      if (likeSummary.userLike === likeType) {
        onUnlike?.(task.taskId);
      } else {
        // If user liked with different type, change it
        onLike?.(task.taskId, likeType);
      }
    } else {
      // New like
      onLike?.(task.taskId, likeType);
    }
  };

  const handleCommentSubmit = () => {
    if (commentText.trim()) {
      onComment?.(task.taskId, commentText.trim());
      setCommentText('');
    }
  };

  const handleCommentReaction = (commentId: number, reactionType: 'like' | 'love' | 'laugh' | 'angry') => {
    setCommentReactions(prev => ({
      ...prev,
      [commentId]: prev[commentId] === reactionType ? '' : reactionType
    }));
  };

  const handleReply = (commentId: number) => {
    setReplyingTo(commentId);
    setReplyText('');
  };

  const handleReplySubmit = (parentCommentId: number) => {
    if (replyText.trim()) {
      // TODO: Implement nested comment submission
      console.log('Reply to comment', parentCommentId, ':', replyText);
      setReplyText('');
      setReplyingTo(null);
    }
  };

  const canEdit = task.createdBy === currentUserId;
  const canDelete = task.createdBy === currentUserId;
  const canUpdateStatus = task.assignedTo === currentUserId || task.createdBy === currentUserId;

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes liquid {
            0%, 100% { border-radius: 4px; }
            50% { border-radius: 6px; }
          }
          @keyframes glow {
            0%, 100% { 
              box-shadow: 0 0 20px rgba(100, 181, 246, 0.3);
            }
            50% { 
              box-shadow: 0 0 30px rgba(100, 181, 246, 0.5);
            }
          }
        `}
      </style>
      <Card 
        sx={{ 
          mb: 2, 
          maxWidth: compact ? 400 : '100%',
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
          backdropFilter: 'blur(25px) saturate(200%) brightness(1.1)',
          WebkitBackdropFilter: 'blur(25px) saturate(200%) brightness(1.1)',
          borderRadius: 4,
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.2)'
            : '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px 0 rgba(31, 38, 135, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 0 20px rgba(100, 181, 246, 0.1)'
            : '0 8px 32px 0 rgba(31, 38, 135, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.4), 0 0 20px rgba(59, 130, 246, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'liquid 4s ease-in-out infinite',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(100, 181, 246, 0.6), transparent)',
            opacity: theme.palette.mode === 'dark' ? 0.4 : 0.7,
            animation: 'shimmer 3s infinite',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(100, 181, 246, 0.1) 0%, transparent 70%)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          },
          '&:hover': {
            transform: 'translateY(-2px) scale(1.02)',
            animation: 'glow 2s ease-in-out infinite',
            '&::after': {
              opacity: 1,
            }
          }
        }}
      >
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {task.createdByUser ? task.createdByUser.userName[0].toUpperCase() : 'U'}
              </Avatar>
              <Box>
                <Typography variant="subtitle2">
                  {task.createdByUser ? `${task.createdByUser.userName} ${task.createdByUser.userLastName}` : 'Unknown User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={statusLabels[task.status]}
                color={statusColors[task.status]}
                size="small"
              />
              {showActions && (
                <IconButton size="small" onClick={handleMenuOpen}>
                  <MoreVertIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Task Content */}
          <Typography variant="h6" gutterBottom>
            {task.title}
          </Typography>

          {task.description && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {task.description}
            </Typography>
          )}

          {/* Task Image */}
          {task.imageUrl && (
            <Box mb={2}>
              <Box
                component="img"
                src={task.imageUrl}
                alt={task.title}
                onClick={() => setShowImagePreview(true)}
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  }
                }}
              />
            </Box>
          )}

          {/* Assignment and Due Date */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            {task.assignedToUser && (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption">Assigned to:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {task.assignedToUser.userName} {task.assignedToUser.userLastName}
                </Typography>
              </Box>
            )}

            {task.dueDate && (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption">Due:</Typography>
                <Typography variant="body2">
                  {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
            {/* Like Buttons */}
            <Zoom in={true} timeout={300}>
              <IconButton
                size="small"
                onClick={() => handleLike('like')}
                color={likeSummary?.userLike === 'like' ? 'primary' : 'default'}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                  '&.MuiIconButton-colorPrimary': {
                    transform: 'scale(1.2)',
                  }
                }}
              >
                <LikeIcon fontSize="small" />
                {task._count?.likes || 0}
              </IconButton>
            </Zoom>

            <Zoom in={true} timeout={400}>
              <IconButton
                size="small"
                onClick={() => handleLike('love')}
                color={likeSummary?.userLike === 'love' ? 'error' : 'default'}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                  '&.MuiIconButton-colorError': {
                    transform: 'scale(1.2)',
                  }
                }}
              >
                <LoveIcon fontSize="small" />
                {task._count?.love || 0}
              </IconButton>
            </Zoom>

            <Zoom in={true} timeout={500}>
              <IconButton
                size="small"
                onClick={() => handleLike('laugh')}
                color={likeSummary?.userLike === 'laugh' ? 'warning' : 'default'}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1) rotate(10deg)',
                  },
                  '&.MuiIconButton-colorWarning': {
                    transform: 'scale(1.2) rotate(15deg)',
                  }
                }}
              >
                <LaughIcon fontSize="small" />
                {task._count?.laugh || 0}
              </IconButton>
            </Zoom>

            <Zoom in={true} timeout={600}>
              <IconButton
                size="small"
                onClick={() => handleLike('angry')}
                color={likeSummary?.userLike === 'angry' ? 'error' : 'default'}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1) shake(-5deg)',
                  },
                  '&.MuiIconButton-colorError': {
                    transform: 'scale(1.2) shake(-10deg)',
                  }
                }}
              >
                <AngryIcon fontSize="small" />
                {task._count?.angry || 0}
              </IconButton>
            </Zoom>

            {/* Comments */}
            <IconButton
              size="small"
              onClick={() => setShowComments(!showComments)}
            >
              <CommentIcon fontSize="small" />
              {task._count?.comments || 0}
            </IconButton>
          </Box>

          {/* Status Update for assigned users */}
          {canUpdateStatus && task.status !== 'done' && (
            <Button
              size="small"
              startIcon={<DoneIcon />}
              onClick={() => onStatusUpdate?.(task.taskId, 'done')}
            >
              Mark Done
            </Button>
          )}
        </CardActions>

        {/* Comments Section */}
        <Collapse in={showComments}>
          <Divider sx={{ 
            borderColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 255, 255, 0.2)',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
          }} />
          <Box 
            p={2} 
            sx={{ 
              background: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.03)' 
                : 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: 3,
              border: theme.palette.mode === 'dark' 
                ? '1px solid rgba(255, 255, 255, 0.1)' 
                : '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: theme.palette.mode === 'dark'
                ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                opacity: theme.palette.mode === 'dark' ? 0.4 : 0.6,
              }
            }}
          >
            {/* Comment Input */}
            <Box display="flex" gap={1} mb={2}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                {currentUserId ? 'U' : 'U'}
              </Avatar>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommentSubmit();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: theme.palette.mode === 'dark' 
                      ? '1px solid rgba(255, 255, 255, 0.2)' 
                      : '1px solid rgba(255, 255, 255, 0.3)',
                    '& fieldset': {
                      borderColor: 'transparent',
                    },
                    '&:hover fieldset': {
                      borderColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.3)' 
                        : 'rgba(255, 255, 255, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.mode === 'dark' 
                        ? 'rgba(100, 181, 246, 0.6)' 
                        : 'rgba(59, 130, 246, 0.8)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 0 0 3px rgba(100, 181, 246, 0.2)'
                        : '0 0 0 3px rgba(59, 130, 246, 0.3)',
                    },
                    '& input': {
                      color: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.9)' 
                        : 'rgba(0, 0, 0, 0.8)',
                    },
                    '& input::placeholder': {
                      color: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.5)' 
                        : 'rgba(0, 0, 0, 0.5)',
                    }
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim()}
                sx={{ borderRadius: 3 }}
              >
                Post
              </Button>
            </Box>

            {/* Comments List - Sorted by newest first, most engaging at top */}
            {commentsLoading ? (
              <Box display="flex" justifyContent="center" py={2}>
                <Typography variant="body2" color="text.secondary">
                  Loading comments...
                </Typography>
              </Box>
            ) : comments.length === 0 ? (
              <Box display="flex" justifyContent="center" py={2}>
                <Typography variant="body2" color="text.secondary">
                  No comments yet. Be the first to comment!
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {comments
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((comment) => (
                    <Box key={comment.commentId} sx={{ display: 'flex', gap: 1.5 }}>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          '&:hover': { transform: 'scale(1.05)' }
                        }}
                        onClick={() => {/* TODO: Show user profile */}}
                      >
                        {comment.user?.userName?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="subtitle2" fontWeight="medium" sx={{ fontSize: '0.875rem' }}>
                            {comment.user ? `${comment.user.userName} ${comment.user.userLastName}` : 'Unknown User'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy • h:mm a')}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.875rem',
                            lineHeight: 1.4,
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.08)' 
                              : 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                            padding: 1.5,
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.15)' 
                              : 'rgba(255, 255, 255, 0.2)',
                            boxShadow: theme.palette.mode === 'dark'
                              ? '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                              : '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.3)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '1px',
                              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                              opacity: theme.palette.mode === 'dark' ? 0.5 : 0.7,
                            }
                          }}
                        >
                          {comment.comment}
                        </Typography>
                        
                        {/* Comment Actions */}
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                          {/* Like Button */}
                          <IconButton 
                            size="small" 
                            sx={{ 
                              fontSize: '0.75rem',
                              color: commentReactions[comment.commentId] === 'like' ? 'primary' : 'default',
                              backgroundColor: commentReactions[comment.commentId] === 'like' 
                                ? theme.palette.mode === 'dark' ? 'rgba(255, 234, 167, 0.2)' : 'rgba(255, 234, 167, 0.3)'
                                : 'transparent',
                              '&:hover': {
                                backgroundColor: theme.palette.mode === 'dark' 
                                  ? 'rgba(255, 234, 167, 0.1)' 
                                  : 'rgba(255, 234, 167, 0.2)',
                              }
                            }}
                            onClick={() => handleCommentReaction(comment.commentId, 'like')}
                          >
                            <LikeIcon fontSize="inherit" />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              Like
                            </Typography>
                          </IconButton>

                          {/* Love Button */}
                          <IconButton 
                            size="small" 
                            sx={{ 
                              fontSize: '0.75rem',
                              color: commentReactions[comment.commentId] === 'love' ? 'error' : 'default',
                              backgroundColor: commentReactions[comment.commentId] === 'love'
                                ? theme.palette.mode === 'dark' ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255, 118, 117, 0.3)'
                                : 'transparent',
                              '&:hover': {
                                backgroundColor: theme.palette.mode === 'dark' 
                                  ? 'rgba(255, 118, 117, 0.1)' 
                                  : 'rgba(255, 118, 117, 0.2)',
                              }
                            }}
                            onClick={() => handleCommentReaction(comment.commentId, 'love')}
                          >
                            <LoveIcon fontSize="inherit" />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              Love
                            </Typography>
                          </IconButton>

                          {/* Laugh Button */}
                          <IconButton 
                            size="small" 
                            sx={{ 
                              fontSize: '0.75rem',
                              color: commentReactions[comment.commentId] === 'laugh' ? 'warning' : 'default',
                              backgroundColor: commentReactions[comment.commentId] === 'laugh'
                                ? theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.3)'
                                : 'transparent',
                              '&:hover': {
                                backgroundColor: theme.palette.mode === 'dark' 
                                  ? 'rgba(255, 193, 7, 0.1)' 
                                  : 'rgba(255, 193, 7, 0.2)',
                              }
                            }}
                            onClick={() => handleCommentReaction(comment.commentId, 'laugh')}
                          >
                            <LaughIcon fontSize="inherit" />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              Laugh
                            </Typography>
                          </IconButton>

                          {/* Angry Button */}
                          <IconButton 
                            size="small" 
                            sx={{ 
                              fontSize: '0.75rem',
                              color: commentReactions[comment.commentId] === 'angry' ? 'error' : 'default',
                              backgroundColor: commentReactions[comment.commentId] === 'angry'
                                ? theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)'
                                : 'transparent',
                              '&:hover': {
                                backgroundColor: theme.palette.mode === 'dark' 
                                  ? 'rgba(239, 68, 68, 0.1)' 
                                  : 'rgba(239, 68, 68, 0.2)',
                              }
                            }}
                            onClick={() => handleCommentReaction(comment.commentId, 'angry')}
                          >
                            <AngryIcon fontSize="inherit" />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              Angry
                            </Typography>
                          </IconButton>

                          {/* Reply Button */}
                          <IconButton 
                            size="small" 
                            sx={{ 
                              fontSize: '0.75rem',
                              color: 'primary',
                              '&:hover': {
                                backgroundColor: theme.palette.mode === 'dark' 
                                  ? 'rgba(100, 181, 246, 0.1)' 
                                  : 'rgba(100, 181, 246, 0.2)',
                              }
                            }}
                            onClick={() => handleReply(comment.commentId)}
                          >
                            <CommentIcon fontSize="inherit" />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              Reply
                            </Typography>
                          </IconButton>
                        </Box>

                        {/* Reply Input */}
                        {replyingTo === comment.commentId && (
                          <Box display="flex" gap={1} mt={2} ml={4}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                              {currentUserId ? 'U' : 'U'}
                            </Avatar>
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Write a reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleReplySubmit(comment.commentId);
                                }
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  backgroundColor: theme.palette.mode === 'dark' 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'rgba(255, 255, 255, 0.8)',
                                  '& fieldset': {
                                    borderColor: theme.palette.mode === 'dark' 
                                      ? 'rgba(255, 255, 255, 0.1)' 
                                      : 'rgba(0, 0, 0, 0.1)',
                                  },
                                  '&:hover fieldset': {
                                    borderColor: theme.palette.mode === 'dark' 
                                      ? 'rgba(255, 255, 255, 0.2)' 
                                      : 'rgba(0, 0, 0, 0.2)',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: theme.palette.mode === 'dark' 
                                      ? '#64b5f6' 
                                      : '#2196f3',
                                  },
                                }
                              }}
                            />
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleReplySubmit(comment.commentId)}
                              disabled={!replyText.trim()}
                              sx={{ borderRadius: 2 }}
                            >
                              Reply
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </Card>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canEdit && (
          <MenuItem
            onClick={() => {
              onEdit?.(task);
              handleMenuClose();
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem
            onClick={() => {
              setConfirmDelete(true);
              handleMenuClose();
            }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this task? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
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

      {/* Image Preview Dialog */}
      <Dialog 
        open={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Task Image</DialogTitle>
        <DialogContent>
          {task.imageUrl && (
            <Box
              component="img"
              src={task.imageUrl}
              alt={task.title}
              sx={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImagePreview(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskCard;
