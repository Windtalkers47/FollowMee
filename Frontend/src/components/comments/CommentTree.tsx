import React from 'react';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import { CommentDataProvider, CommentActionProvider } from '../../contexts';
import { Send as SendIcon } from '@mui/icons-material';
import { useComments } from '../../hooks/useComments';
import { flattenCommentTree } from '../../utils/flattenCommentTreeForVirtualization';
import YouTubeThreadedRow from './YouTubeThreadedRow';

interface CommentTreeProps {
  taskId: string;
  maxDepth?: number;
}

/**
 * Reddit-style comment tree container
 * Uses the new consolidated architecture
 */
const CommentTreeComponent: React.FC<CommentTreeProps> = ({
  taskId,
  maxDepth = 3
}) => {
  const commentData = useComments({ taskId, maxDepth });
  const {
    visibleTree,
    isLoading,
    error,
    addComment,
    newCommentText,
    setNewCommentText,
    collapsedThreads,
    hiddenReplyCount,
    refetch
  } = commentData;

  const handleAddComment = async () => {
    if (newCommentText.trim()) {
      await addComment(newCommentText);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        Loading comments...
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        Error loading comments: {error.message}
      </Box>
    );
  }

  if (!visibleTree?.nodes.length) {
    return (
      <CommentDataProvider value={{
        comments: commentData.comments,
        commentTree: commentData.commentTree,
        visibleTree,
        isLoading,
        error,
        refetch,
        collapsedThreads,
        hiddenReplyCount
      }}>
        <CommentActionProvider value={commentData}>
          <Box>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No comments yet. Be the first to comment!
              </Typography>
            </Box>
            
            {/* Main Comment Input */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                Add a comment
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                <Avatar 
                  sx={{ width: 32, height: 32 }}
                >
                  U
                </Avatar>
                <Box flex={1}>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: 'rgba(0, 0, 0, 0.8)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(0, 0, 0, 0.4)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                    }}
                  />
                </Box>
                <IconButton
                  onClick={handleAddComment}
                  disabled={!newCommentText.trim()}
                  color="primary"
                  sx={{ 
                    width: 40, 
                    height: 40,
                    backgroundColor: 'rgba(25, 118, 210, 0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    },
                    '&:disabled': {
                      backgroundColor: 'transparent',
                    }
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </CommentActionProvider>
      </CommentDataProvider>
    );
  }

  // Flatten the tree for rendering
  const flatRows = flattenCommentTree(visibleTree.nodes);

  // Memoize context values
  const dataContextValue = React.useMemo(() => ({
    comments: commentData.comments,
    commentTree: commentData.commentTree,
    visibleTree,
    isLoading,
    error,
    refetch,
    collapsedThreads,
    hiddenReplyCount
  }), [commentData.comments, commentData.commentTree, visibleTree, isLoading, error, refetch, collapsedThreads, hiddenReplyCount]);

  return (
    <CommentDataProvider value={dataContextValue}>
      <CommentActionProvider value={commentData}>
        <Box>
          {/* Comment count header */}
          <Box sx={{ mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {visibleTree.totalComments} {visibleTree.totalComments === 1 ? 'Comment' : 'Comments'}
            </Typography>
          </Box>

          {/* Render flattened comments using YouTubeThreadedRow */}
          {flatRows.map((row) => (
            <YouTubeThreadedRow key={row.comment.comment.commentId} row={row} />
          ))}
        
        {/* Main Comment Input */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
            Add a comment
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
            <Avatar 
              sx={{ width: 32, height: 32 }}
            >
              U
            </Avatar>
            <Box flex={1}>
              <input
                type="text"
                placeholder="Write a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: 'rgba(0, 0, 0, 0.8)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0, 0, 0, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                }}
              />
            </Box>
            <IconButton
              onClick={handleAddComment}
              disabled={!newCommentText.trim()}
              color="primary"
              sx={{ 
                width: 40, 
                height: 40,
                backgroundColor: 'rgba(25, 118, 210, 0.05)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                },
                '&:disabled': {
                  backgroundColor: 'transparent',
                }
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </CommentActionProvider>
    </CommentDataProvider>
  );
};

CommentTreeComponent.displayName = 'CommentTree';

export default CommentTreeComponent;
