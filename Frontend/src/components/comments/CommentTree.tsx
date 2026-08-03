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
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface CommentTreeProps {
  taskId: string;
  maxDepth?: number;
}

const CommentTreeComponent: React.FC<CommentTreeProps> = ({ taskId, maxDepth = 2 }) => {
  const commentData = useComments({ taskId, maxDepth });
  const currentUser = useAppSelector(selectCurrentUser);
  const [searchParams] = useSearchParams();
  const { t } = useUserPreferences();
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
          <Stack direction="row" spacing={1} alignItems="flex-start">
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
              placeholder={t('comments.placeholder')}
              size="small"
              multiline
              maxRows={5}
              fullWidth
            />
            <IconButton
              color="primary"
              aria-label={t('comments.send')}
              disabled={!newCommentText.trim()}
              onClick={submit}
            >
              <Send />
            </IconButton>
          </Stack>

          <Box sx={{ mt: 1.75, pb: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={750}>
              {t('comments.count', { count: visibleTree?.totalComments || 0 })}
            </Typography>
          </Box>

          {isLoading && (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              {t('comments.loading')}
            </Typography>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t('comments.loadError')}
            </Alert>
          )}
          {!isLoading && !error && flatRows.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              {t('comments.empty')}
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
