import React from 'react';
import { Box, Button, Chip, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { AddReactionOutlined, ChatBubbleOutline } from '@mui/icons-material';
import { TaskLikeSummary } from '../../api/task.api';

interface TaskReactionsProps {
  taskId: string;
  likeSummary?: TaskLikeSummary;
  onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => void;
  onUnlike?: (taskId: string) => void;
  onCommentToggle: () => void;
  showComments: boolean;
}

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😠', label: 'Angry' },
] as const;

const TaskReactions: React.FC<TaskReactionsProps> = ({
  taskId,
  likeSummary,
  onLike,
  onUnlike,
  onCommentToggle,
  showComments,
}) => {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const userLike = likeSummary?.userLike;
  const activeReactions = REACTIONS.filter(reaction => (likeSummary?.[reaction.type] || 0) > 0);

  const selectReaction = (type: typeof REACTIONS[number]['type']) => {
    if (userLike === type) onUnlike?.(taskId);
    else onLike?.(taskId, type);
    setAnchor(null);
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      useFlexGap
      flexWrap="wrap"
      spacing={0.75}
      sx={{ mt: 0.75 }}
    >
      {activeReactions.map(reaction => (
        <Chip
          key={reaction.type}
          size="small"
          label={`${reaction.emoji} ${likeSummary?.[reaction.type] || 0}`}
          color={userLike === reaction.type ? 'primary' : 'default'}
          variant={userLike === reaction.type ? 'filled' : 'outlined'}
          onClick={() => selectReaction(reaction.type)}
          sx={{ height: 28 }}
        />
      ))}
      <IconButton
        size="small"
        aria-label="Add reaction"
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ width: 34, height: 34 }}
      >
        <AddReactionOutlined fontSize="small" />
      </IconButton>
      <Button
        size="small"
        color={showComments ? 'primary' : 'inherit'}
        startIcon={<ChatBubbleOutline />}
        onClick={onCommentToggle}
      >
        Comment
      </Button>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {REACTIONS.map(reaction => (
          <MenuItem key={reaction.type} onClick={() => selectReaction(reaction.type)}>
            <Box component="span" sx={{ width: 32, fontSize: 18 }}>{reaction.emoji}</Box>
            {reaction.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
};

export default React.memo(TaskReactions);
