import React from 'react';
import { Alert, Box, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Send } from '@mui/icons-material';
import { CommentActionContext, CommentDataContext } from '../../contexts';
import { useComments } from '../../hooks/useComments';
import { flattenCommentTree } from '../../utils/flattenCommentTreeForVirtualization';
import { useAppSelector } from '../../store/store';
import { selectCurrentUser } from '../../store/slices/authSlice';
import YouTubeThreadedRow from './YouTubeThreadedRow';
import SmartAvatar from '../SmartAvatar';
import { useSearchParams } from 'react-router-dom';

interface CommentTreeProps {
  taskId: string;
  maxDepth?: number;
}

const CommentTreeComponent: React.FC<CommentTreeProps> = ({ taskId, maxDepth = 2 }) => {
  const commentData = useComments({ taskId, maxDepth });
  const currentUser = useAppSelector(selectCurrentUser);
  const [searchParams] = useSearchParams();
  const {
    visibleTree,
    isLoading,
    error,
    newCommentText,
    setNewCommentText,
    handleAddComment,
  } = commentData;

  const flatRows = React.useMemo(
    () => visibleTree ? flattenCommentTree(visibleTree.nodes) : [],
    [visibleTree]
  );

  React.useEffect(() => {
    const commentId = searchParams.get('comment');
    if (!commentId || flatRows.length === 0) return;
    const target = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('highlight-comment');
    const timer = window.setTimeout(() => target.classList.remove('highlight-comment'), 2200);
    return () => window.clearTimeout(timer);
  }, [searchParams, flatRows]);

  const dataContextValue = React.useMemo(() => ({
    comments: commentData.comments,
    commentTree: commentData.commentTree,
    visibleTree,
    isLoading,
    error,
    refetch: commentData.refetch,
    collapsedThreads: commentData.collapsedThreads,
    hiddenReplyCount: commentData.hiddenReplyCount,
  }), [
    commentData.comments,
    commentData.commentTree,
    visibleTree,
    isLoading,
    error,
    commentData.refetch,
    commentData.collapsedThreads,
    commentData.hiddenReplyCount,
  ]);

  const submit = () => {
    if (newCommentText.trim()) void handleAddComment(newCommentText);
  };

  return (
    <CommentDataContext.Provider value={dataContextValue}>
      <CommentActionContext.Provider value={commentData}>
        <Box sx={{
          '& .highlight-comment': {
            borderRadius: 2,
            bgcolor: 'action.selected',
            outline: '2px solid',
            outlineColor: 'primary.main',
          },
        }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <SmartAvatar user={currentUser} avatarVariant="glass" size={34} />
            <TextField
              value={newCommentText}
              onChange={(event) => setNewCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Write a comment or mention @username…"
              size="small"
              multiline
              maxRows={5}
              fullWidth
            />
            <IconButton
              color="primary"
              aria-label="Send comment"
              disabled={!newCommentText.trim()}
              onClick={submit}
            >
              <Send />
            </IconButton>
          </Stack>

          <Box sx={{ mt: 2.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={750}>
              {visibleTree?.totalComments || 0} {(visibleTree?.totalComments || 0) === 1 ? 'comment' : 'comments'}
            </Typography>
          </Box>

          {isLoading && (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Loading comments…
            </Typography>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Unable to load comments. Please try again.
            </Alert>
          )}
          {!isLoading && !error && flatRows.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No comments yet. Start the conversation.
            </Typography>
          )}
          {!isLoading && !error && flatRows.map(row => (
            <YouTubeThreadedRow key={row.comment.comment.commentId} row={row} />
          ))}
        </Box>
      </CommentActionContext.Provider>
    </CommentDataContext.Provider>
  );
};

export default React.memo(CommentTreeComponent);
