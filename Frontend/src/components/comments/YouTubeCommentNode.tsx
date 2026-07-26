import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddReactionOutlined,
  ExpandLess,
  ExpandMore,
  MoreHoriz,
  Send,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import { useCommentActionContext } from '../../contexts';
import { useAppSelector } from '../../store/store';
import { selectCurrentUser } from '../../store/slices/authSlice';

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😠', label: 'Angry' },
] as const;

const cleanName = (user?: { userName?: string; userLastName?: string }) =>
  [user?.userName, user?.userLastName].filter(Boolean).join(' ') || 'Unknown user';

interface Props {
  row: FlatCommentRow;
}

const YouTubeCommentNode: React.FC<Props> = ({ row }) => {
  const actions = useCommentActionContext();
  const currentUser = useAppSelector(selectCurrentUser);
  const { comment, depth, hasChildren } = row;
  const data = comment.comment;
  const displayUser = data.user || {
    userId: data.userId,
    userName: 'Unknown',
    userLastName: '',
  };
  const isOwner = currentUser?.userId === data.userId;
  const isEditing = actions.editingComment === data.commentId;
  const isReplying = actions.replyingTo === data.commentId;
  const isCollapsed = actions.collapsedThreads.has(data.commentId);
  const [reactionAnchor, setReactionAnchor] = React.useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = React.useState<HTMLElement | null>(null);

  const reactionGroups = React.useMemo(() => {
    const grouped = new Map<string, number>();
    (data.reactions || []).forEach((reaction: { reactionType: string }) => {
      grouped.set(reaction.reactionType, (grouped.get(reaction.reactionType) || 0) + 1);
    });
    return [...grouped.entries()];
  }, [data.reactions]);

  const submitReply = () => actions.handleReplySubmit(data.commentId);

  return (
    <Box sx={{ py: 1.25 }}>
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        <Avatar
          src={displayUser.userImageUrl}
          alt={cleanName(displayUser)}
          sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}
        >
          {displayUser.userName?.charAt(0)?.toUpperCase() || '?'}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 24 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {cleanName(displayUser)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
            </Typography>
            {isOwner && (
              <IconButton
                size="small"
                aria-label="Comment actions"
                onClick={(event) => setMoreAnchor(event.currentTarget)}
                sx={{ ml: 'auto' }}
              >
                <MoreHoriz fontSize="small" />
              </IconButton>
            )}
          </Box>

          {isEditing ? (
            <Stack spacing={1} sx={{ mt: 0.5 }}>
              <TextField
                size="small"
                fullWidth
                multiline
                maxRows={5}
                value={actions.editText}
                onChange={(event) => actions.setEditText(event.target.value)}
              />
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" onClick={() => actions.handleEditSubmit(data.commentId)}>
                  Save
                </Button>
                <Button size="small" color="inherit" onClick={actions.handleEditCancel}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Box
              sx={{
                mt: 0.35,
                p: 1.25,
                borderRadius: 2,
                bgcolor: 'action.hover',
                overflowWrap: 'anywhere',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {data.comment}
              </Typography>
              {data.commentImageUrl && (
                <Box
                  component="img"
                  src={data.commentImageUrl}
                  alt="Comment attachment"
                  loading="lazy"
                  sx={{
                    display: 'block',
                    mt: 1,
                    maxWidth: '100%',
                    maxHeight: 320,
                    borderRadius: 1.5,
                    objectFit: 'contain',
                    bgcolor: 'background.default',
                  }}
                />
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
            {reactionGroups.map(([type, count]) => {
              const reaction = REACTIONS.find(item => item.type === type);
              if (!reaction) return null;
              return (
                <Chip
                  key={type}
                  size="small"
                  label={`${reaction.emoji} ${count}`}
                  onClick={() => actions.updateReaction(data.commentId, reaction.type)}
                  sx={{ height: 26 }}
                />
              );
            })}
            <IconButton
              size="small"
              aria-label="Add reaction"
              onClick={(event) => setReactionAnchor(event.currentTarget)}
              sx={{ width: 30, height: 30 }}
            >
              <AddReactionOutlined fontSize="small" />
            </IconButton>
            <Button size="small" color="inherit" onClick={() => actions.handleReply(data.commentId)}>
              Reply
            </Button>
            {hasChildren && (
              <Button
                size="small"
                startIcon={isCollapsed ? <ExpandMore /> : <ExpandLess />}
                onClick={() => actions.toggleCollapse(data.commentId)}
              >
                {isCollapsed ? 'Show replies' : 'Hide replies'}
              </Button>
            )}
          </Box>

          {isReplying && (
            <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
              <TextField
                size="small"
                fullWidth
                autoFocus
                multiline
                maxRows={4}
                placeholder={`Reply to ${displayUser.userName || 'this comment'}…`}
                value={actions.getReplyText(data.commentId)}
                onChange={(event) => actions.handleReplyTextChange(data.commentId, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submitReply();
                  }
                }}
              />
              <IconButton
                color="primary"
                aria-label="Send reply"
                disabled={!actions.getReplyText(data.commentId).trim()}
                onClick={submitReply}
              >
                <Send />
              </IconButton>
              <Button size="small" color="inherit" onClick={actions.handleReplyCancel}>
                Cancel
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Menu
        anchorEl={reactionAnchor}
        open={Boolean(reactionAnchor)}
        onClose={() => setReactionAnchor(null)}
      >
        {REACTIONS.map(reaction => (
          <MenuItem
            key={reaction.type}
            onClick={() => {
              actions.updateReaction(data.commentId, reaction.type);
              setReactionAnchor(null);
            }}
          >
            <Box component="span" sx={{ width: 30, fontSize: 18 }}>{reaction.emoji}</Box>
            {reaction.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem
          onClick={() => {
            actions.handleEditStart(data.commentId, data.comment);
            setMoreAnchor(null);
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          sx={{ color: 'error.main' }}
          onClick={() => {
            setMoreAnchor(null);
            if (window.confirm('Delete this comment?')) actions.handleDeleteComment(data.commentId);
          }}
        >
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default React.memo(YouTubeCommentNode);
