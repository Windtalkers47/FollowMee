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
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Task, TaskLikeSummary, commentApi, commentReactionApi } from '../../src/api/task.api';
import { CommentTree } from './comments';
import { useComments } from '../hooks/useComments';

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

// Recursive component for nested replies
const NestedReply: React.FC<{
  reply: any;
  level: number;
  onReply: (commentId: number) => void;
  onCommentReaction: (commentId: number, reactionType: 'like' | 'love' | 'laugh' | 'angry') => void;
  commentReactions: Record<number, string>;
  format: (date: Date, formatStr: string) => string;
  theme: any;
  setShowImagePreview: (show: boolean) => void;
  replyingTo: number | null;
  replyText: string;
  replyImages: Record<number, string>;
  user: any;
  onReplyTextChange: (text: string) => void;
  onReplySubmit: (commentId: number) => void;
  onReplyImageUpload: (commentId: number, files: File[]) => void;
  onReplyImageRemove: (commentId: number) => void;
  parentUser?: any; // Add parent user for @mentions
}> = ({ 
  reply, 
  level, 
  onReply, 
  onCommentReaction, 
  commentReactions, 
  format, 
  theme, 
  setShowImagePreview,
  replyingTo,
  replyText,
  replyImages,
  user,
  onReplyTextChange,
  onReplySubmit,
  onReplyImageUpload,
  onReplyImageRemove,
  parentUser
}) => {
  const hasNestedReplies = reply.replies && reply.replies.length > 0;
  const maxNestingLevel = 3; // Facebook limits to 3 levels
  const indentPixels = level * 32; // 32px per level for clear indentation
  const [showCollapsedReplies, setShowCollapsedReplies] = useState(false);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Horizontal connector line - Facebook style */}
      {level > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: indentPixels + 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 20,
            height: 2,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.1)',
          }}
        />
      )}
      
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 1.5, 
          mb: 2,
          ml: `${indentPixels}px`,
          position: 'relative',
        }}
      >
        
        <Avatar 
                  src={reply.user?.userImageUrl}
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    fontSize: '1rem',
                    fontWeight: 'medium',
                    bgcolor: reply.user?.userImageUrl ? 'transparent' : theme.palette.primary.main,
                    color: reply.user?.userImageUrl ? 'transparent' : theme.palette.primary.contrastText,
                    border: theme.palette.mode === 'dark' 
                      ? '3px solid rgba(255, 255, 255, 0.1)' 
                      : '3px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                      : '0 4px 12px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 6px 16px rgba(0, 0, 0, 0.25)'
                        : '0 6px 16px rgba(0, 0, 0, 0.12)',
                    }
                  }}
                >
                  {reply.user?.userImageUrl ? '' : (reply.user?.userName?.[0]?.toUpperCase() || reply.user?.userLastName?.[0]?.toUpperCase() || 'U')}
                </Avatar>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Typography variant="subtitle2" fontWeight="medium" sx={{ fontSize: '0.875rem' }}>
              {reply.user ? `${reply.user.userName} ${reply.user.userLastName}` : 'Unknown User'}
            </Typography>
            {/* @username mention for replies */}
            {level > 0 && parentUser && (
              <Typography variant="subtitle2" color="primary" sx={{ fontSize: '0.875rem' }}>
                @{parentUser.userName}{parentUser.userLastName}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {format(new Date(reply.createdAt), 'MMM d, yyyy • h:mm a')}
            </Typography>
            {/* Reply indicator */}
            <Chip
              label="reply"
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 20,
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                backgroundColor: 'transparent',
              }}
            />
          </Box>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.875rem',
              lineHeight: 1.5,
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.04)' 
                : 'rgba(0, 0, 0, 0.02)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: 2,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.06)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
                : '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.06)' 
                  : 'rgba(0, 0, 0, 0.03)',
                borderColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.12)' 
                  : 'rgba(0, 0, 0, 0.08)',
                transform: 'translateY(-1px)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
                  : '0 6px 16px rgba(0, 0, 0, 0.12), 0 3px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                opacity: theme.palette.mode === 'dark' ? 0.4 : 0.6,
              }
            }}
          >
            {reply.comment}
          </Typography>
          
          {/* Reply Image */}
          {reply.commentImageUrl && (
            <Box mt={1}>
              <Box
                component="img"
                src={reply.commentImageUrl}
                alt="Reply image"
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.9,
                  }
                }}
                onClick={() => setShowImagePreview(true)}
              />
            </Box>
          )}
          
          {/* Reply Actions */}
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            {/* Like Button */}
            <IconButton 
              size="small" 
              sx={{ 
                fontSize: '0.75rem',
                color: commentReactions[reply.commentId] === 'like' ? 'primary' : 'default',
                backgroundColor: commentReactions[reply.commentId] === 'like' 
                  ? theme.palette.mode === 'dark' ? 'rgba(255, 234, 167, 0.2)' : 'rgba(255, 234, 167, 0.3)'
                  : 'transparent',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 234, 167, 0.1)' 
                    : 'rgba(255, 234, 167, 0.2)',
                }
              }}
              onClick={() => onCommentReaction(reply.commentId, 'like')}
            >
              <LikeIcon fontSize="inherit" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                Like
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
              onClick={() => onReply(reply.commentId)}
            >
              <CommentIcon fontSize="inherit" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                Reply
              </Typography>
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Reply Input for nested replies */}
      {replyingTo === reply.commentId && (
        <Box display="flex" flexDirection="column" gap={1} mt={2} ml={`${indentPixels + 16}px`}>
          <Box display="flex" gap={1}>
            <Avatar 
              src={user?.userImageUrl}
              sx={{ 
                width: 24, 
                height: 24, 
                fontSize: '0.75rem',
                bgcolor: user?.userImageUrl ? 'transparent' : theme.palette.primary.main,
                color: user?.userImageUrl ? 'transparent' : theme.palette.primary.contrastText,
              }}
            >
              {user?.userImageUrl ? '' : (user?.userName?.[0]?.toUpperCase() || user?.userLastName?.[0]?.toUpperCase() || 'U')}
            </Avatar>
            <Box flex={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onReplySubmit(reply.commentId);
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
              {/* Show uploaded reply image preview */}
              {replyImages[reply.commentId] && (
                <Box mt={1} position="relative">
                  <Box
                    component="img"
                    src={replyImages[reply.commentId]}
                    alt="Reply image"
                    sx={{
                      width: '100%',
                      maxHeight: 150,
                      objectFit: 'cover',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.2)' 
                        : 'rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => onReplyImageRemove(reply.commentId)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.7)' 
                        : 'rgba(255, 255, 255, 0.9)',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(0, 0, 0, 0.9)' 
                          : 'rgba(255, 255, 255, 1)',
                      }
                    }}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
            <Box display="flex" flexDirection="column" gap={0.5}>
              <IconButton
                size="small"
                onClick={() => onReplyImageUpload(reply.commentId, [new File([''], 'placeholder')])}
                sx={{
                  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                }}
              >
                <CommentIcon fontSize="small" />
              </IconButton>
              <Button
                variant="contained"
                size="small"
                onClick={() => onReplySubmit(reply.commentId)}
                disabled={!replyText.trim() && !replyImages[reply.commentId]}
                sx={{ borderRadius: 2 }}
              >
                Reply
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Recursive nested replies - Facebook style nested structure */}
      {hasNestedReplies && (
        <Box sx={{ ml: `${indentPixels}px`, position: 'relative', pt: 2 }}>
          
          {level < maxNestingLevel ? (
            // Show nested replies normally
            reply.replies.map((nestedReply: any) => (
              <NestedReply
                key={nestedReply.commentId}
                reply={nestedReply}
                level={level + 1}
                onReply={onReply}
                onCommentReaction={onCommentReaction}
                commentReactions={commentReactions}
                format={format}
                theme={theme}
                setShowImagePreview={setShowImagePreview}
                replyingTo={replyingTo}
                replyText={replyText}
                replyImages={replyImages}
                user={user}
                onReplyTextChange={onReplyTextChange}
                onReplySubmit={onReplySubmit}
                onReplyImageUpload={onReplyImageUpload}
                onReplyImageRemove={onReplyImageRemove}
                parentUser={reply.user} // Pass current reply user as parent for @mentions
              />
            ))
          ) : (
            // Show collapse button for deep nesting
            <>
              {!showCollapsedReplies ? (
                <Box mt={1} ml={`${indentPixels}px`}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setShowCollapsedReplies(true)}
                    sx={{
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.05)',
                      }
                    }}
                  >
                    View {reply.replies.length} more {reply.replies.length === 1 ? 'reply' : 'replies'}
                  </Button>
                </Box>
              ) : (
                <>
                  {reply.replies.map((nestedReply: any) => (
                    <NestedReply
                      key={nestedReply.commentId}
                      reply={nestedReply}
                      level={level + 1}
                      onReply={onReply}
                      onCommentReaction={onCommentReaction}
                      commentReactions={commentReactions}
                      format={format}
                      theme={theme}
                      setShowImagePreview={setShowImagePreview}
                      replyingTo={replyingTo}
                      replyText={replyText}
                      replyImages={replyImages}
                      user={user}
                      onReplyTextChange={onReplyTextChange}
                      onReplySubmit={onReplySubmit}
                              onReplyImageUpload={onReplyImageUpload}
                              onReplyImageRemove={onReplyImageRemove}
                      parentUser={reply.user}
                    />
                  ))}
                  <Box mt={1} ml={`${indentPixels}px`}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setShowCollapsedReplies(false)}
                      sx={{
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.1)' 
                            : 'rgba(0, 0, 0, 0.05)',
                        }
                      }}
                    >
                      Hide replies
                    </Button>
                  </Box>
                </>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  likeSummary,
  currentUserId,
  onEdit,
  onDelete,
  onLike,
  onUnlike,
  onStatusUpdate,
  showActions = true,
  compact = false,
}) => {
  const theme = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [commentReactions, setCommentReactions] = useState<Record<number, string>>({});

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

  const handleLike = (likeType: 'like' | 'love' | 'laugh' | 'angry') => {
    if (likeSummary?.userLike) {
      // If user already liked with same type, remove it
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

  // Mutations for comment operations
  const createCommentMutation = useMutation({
    mutationFn: ({ comment, commentImageUrl }: { comment: string; commentImageUrl?: string }) =>
      commentApi.createComment(task.taskId, { comment, commentImageUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.taskId] });
      setCommentText('');
    }
  });

  const commentReactionMutation = useMutation({
    mutationFn: ({ commentId, reactionType }: { commentId: number; reactionType: 'like' | 'love' | 'laugh' | 'angry' }) =>
      commentReactionApi.createOrUpdateReaction(commentId, { reactionType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.taskId] });
    }
  });

  const removeCommentReactionMutation = useMutation({
    mutationFn: (commentId: number) =>
      commentReactionApi.removeReaction(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.taskId] });
    }
  });

  const handleCommentReaction = (commentId: number, reactionType: 'like' | 'love' | 'laugh' | 'angry') => {
    const currentReaction = commentReactions[commentId];
    if (currentReaction === reactionType) {
      // Remove reaction
      removeCommentReactionMutation.mutate(commentId);
      setCommentReactions(prev => {
        const newReactions = { ...prev };
        delete newReactions[commentId];
        return newReactions;
      });
    } else {
      // Add or change reaction
      commentReactionMutation.mutate({ commentId, reactionType });
      setCommentReactions(prev => ({
        ...prev,
        [commentId]: reactionType
      }));
    }
  };

  const handleCommentSubmit = () => {
    if (commentText.trim()) {
      createCommentMutation.mutate({
        comment: commentText.trim()
      });
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
              <Avatar 
                src={task.createdByUser?.userImageUrl}
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: task.createdByUser?.userImageUrl ? 'transparent' : theme.palette.primary.main,
                  color: task.createdByUser?.userImageUrl ? 'transparent' : theme.palette.primary.contrastText,
                }}
              >
                {task.createdByUser?.userImageUrl ? '' : (task.createdByUser?.userName?.[0]?.toUpperCase() || task.createdByUser?.userLastName?.[0]?.toUpperCase() || 'U')}
              </Avatar>
              <Box>
                <Typography variant="subtitle2">
                  {task.createdByUser ? `${task.createdByUser.userName} ${task.createdByUser.userLastName}` : 'Unknown User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(task.createdAt), 'MMM dd, yyyy • h:mm a')}
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

          {/* Task Images */}
          {task.images && task.images.length > 0 && (
            <Box mb={2}>
              <Box display="flex" flexDirection="column" gap={1}>
                {task.images.map((image: any, index: number) => (
                  <Box
                    key={image.imageId}
                    component="img"
                    src={image.imageUrl}
                    alt={`${task.title} - Image ${index + 1}`}
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
                ))}
              </Box>
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
          <Box p={2}>
            {/* Use new Reddit-style comment system */}
            {commentTree && (
              <CommentTree
                commentTree={commentTree}
                onReaction={handleCommentReaction}
                theme={theme}
                currentUserId={currentUserId}
                taskId={task.taskId}
                onCommentAdded={() => {
                  // Refetch comments after adding
                  commentsRefetch();
                }}
              />
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
        <DialogTitle>Task Images</DialogTitle>
        <DialogContent>
          {task.images && task.images.length > 0 ? (
            <Box display="flex" flexDirection="column" gap={2}>
              {task.images.map((image: any, index: number) => (
                <Box key={image.imageId}>
                  <Typography variant="subtitle2" mb={1}>
                    Image {index + 1}
                  </Typography>
                  <Box
                    component="img"
                    src={image.imageUrl}
                    alt={`${task.title} - Image ${index + 1}`}
                    sx={{
                      width: '100%',
                      maxHeight: 400,
                      objectFit: 'contain',
                      borderRadius: 2,
                    }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No images available for this task.
            </Typography>
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
