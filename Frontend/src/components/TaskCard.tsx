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
  Button,
  TextField,
  Collapse,
  Divider,
  Zoom,
  Fade,
  Grow,
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const canEdit = task.createdBy === currentUserId;
  const canDelete = task.createdBy === currentUserId;
  const canUpdateStatus = task.assignedTo === currentUserId || task.createdBy === currentUserId;

  return (
    <>
      <Card sx={{ mb: 2, maxWidth: compact ? 400 : '100%' }}>
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
              <img
                src={task.imageUrl}
                alt={task.title}
                style={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 8,
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
          <Divider />
          <Box p={2}>
            {/* Comment Input */}
            <Box display="flex" gap={1} mb={2}>
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
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim()}
              >
                Post
              </Button>
            </Box>

            {/* Comments List */}
            {commentsLoading ? (
              <Typography variant="body2" color="text.secondary">
                Loading comments...
              </Typography>
            ) : comments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No comments yet. Be the first to comment!
              </Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={1}>
                {comments.map((comment) => (
                  <Box key={comment.commentId} display="flex" gap={1} p={1} bgcolor="grey.50" borderRadius={1}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                      {comment.user?.userName?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {comment.user ? `${comment.user.userName} ${comment.user.userLastName}` : 'Unknown User'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {comment.comment}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
                      </Typography>
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
    </>
  );
};

export default TaskCard;
