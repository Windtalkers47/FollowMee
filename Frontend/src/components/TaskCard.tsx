import React, { useState } from 'react';
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
import { Task, TaskLikeSummary } from '../../src/api/task.api';

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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLike = (likeType: 'like' | 'love' | 'laugh' | 'angry') => {
    if (likeSummary?.userLike) {
      onUnlike?.(task.taskId);
    } else {
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
            <IconButton
              size="small"
              onClick={() => handleLike('like')}
              color={likeSummary?.userLike === 'like' ? 'primary' : 'default'}
            >
              <LikeIcon fontSize="small" />
              {likeSummary?.like || 0}
            </IconButton>

            <IconButton
              size="small"
              onClick={() => handleLike('love')}
              color={likeSummary?.userLike === 'love' ? 'error' : 'default'}
            >
              <LoveIcon fontSize="small" />
              {likeSummary?.love || 0}
            </IconButton>

            <IconButton
              size="small"
              onClick={() => handleLike('laugh')}
              color={likeSummary?.userLike === 'laugh' ? 'warning' : 'default'}
            >
              <LaughIcon fontSize="small" />
              {likeSummary?.laugh || 0}
            </IconButton>

            <IconButton
              size="small"
              onClick={() => handleLike('angry')}
              color={likeSummary?.userLike === 'angry' ? 'error' : 'default'}
            >
              <AngryIcon fontSize="small" />
              {likeSummary?.angry || 0}
            </IconButton>

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

            {/* Comments List - Would be implemented with actual comments data */}
            <Typography variant="body2" color="text.secondary">
              Comments would be displayed here...
            </Typography>
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
