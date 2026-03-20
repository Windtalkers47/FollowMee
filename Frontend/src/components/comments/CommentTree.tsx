import React from 'react';
import { Box, Typography, Avatar, IconButton, useTheme } from '@mui/material';
import { CommentDataContext, CommentActionContext } from '../../contexts';
import { Send as SendIcon } from '@mui/icons-material';
import { useComments } from '../../hooks/useComments';
import { flattenCommentTree } from '../../utils/flattenCommentTreeForVirtualization';
import { useAppSelector } from '../../store/store';
import { selectCurrentUser } from '../../store/slices/authSlice';
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
  maxDepth = 2
}) => {
  const theme = useTheme();
  const commentData = useComments({ taskId, maxDepth });
  const currentUser = useAppSelector(selectCurrentUser);
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
  
  // Glass morphism presets
  const glassOpacity = 0.7;
  const finalOpacity = glassOpacity;
  const finalBlur = 20;
  const finalBorderOpacity = 0.3;

  const handleAddComment = async () => {
    if (newCommentText.trim()) {
      await addComment(newCommentText);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        p: 4,
        background: theme.palette.mode === 'dark' 
          ? `rgba(255, 255, 255, ${finalOpacity * 0.05})`
          : `rgba(255, 255, 255, ${finalOpacity * 0.3})`,
        backdropFilter: `blur(${finalBlur}px)`,
        WebkitBackdropFilter: `blur(${finalBlur}px)`,
        borderRadius: 2,
        border: `1px solid ${theme.palette.mode === 'dark' 
          ? `rgba(255, 255, 255, ${finalBorderOpacity * 0.1})` 
          : `rgba(255, 255, 255, ${finalBorderOpacity * 0.3})`}`,
      }}>
        <Typography sx={{ color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.6)' }}>
          Loading comments...
        </Typography>
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
      <CommentDataContext.Provider value={{
        comments: commentData.comments,
        commentTree: commentData.commentTree,
        visibleTree,
        isLoading,
        error,
        refetch,
        collapsedThreads,
        hiddenReplyCount
      }}>
        <CommentActionContext.Provider value={commentData}>
          <Box>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No comments yet. Be the first to comment!
              </Typography>
            </Box>
            
            {/* Glass Main Comment Input */}
            <Box sx={{ 
              mt: 3, 
              pt: 2, 
              borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
            }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mb: 1.5, 
                  fontWeight: 600,
                  color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.8)',
                  textShadow: theme.palette.mode === 'dark' 
                    ? '0 1px 2px rgba(0, 0, 0, 0.3)' 
                    : '0 1px 2px rgba(255, 255, 255, 0.5)',
                }}
              >
                Add a comment
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                <Avatar 
                  src={currentUser?.userImageUrl || undefined}
                  imgProps={{ crossOrigin: 'anonymous' }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
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
                  {(!currentUser?.userImageUrl || currentUser?.userImageUrl === '') && 
                    `${currentUser?.userName?.[0] || 'U'}${currentUser?.userLastName?.[0] || ''}`}
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
                      padding: '12px 16px',
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                      borderRadius: '12px',
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? `rgba(255, 255, 255, ${finalOpacity * 0.1})`
                        : `rgba(255, 255, 255, ${finalOpacity * 0.8})`,
                      backdropFilter: `blur(${finalBlur}px)`,
                      WebkitBackdropFilter: `blur(${finalBlur}px)`,
                      color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.8)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                        : '0 2px 8px rgba(31, 38, 135, 0.1)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = theme.palette.mode === 'dark'
                        ? '0 4px 16px rgba(0, 0, 0, 0.3)'
                        : '0 4px 16px rgba(31, 38, 135, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = theme.palette.mode === 'dark'
                        ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                        : '0 2px 8px rgba(31, 38, 135, 0.1)';
                    }}
                  />
                </Box>
                <IconButton
                  onClick={handleAddComment}
                  disabled={!newCommentText.trim()}
                  color="primary"
                  sx={{ 
                    width: 44, 
                    height: 44,
                    background: theme.palette.mode === 'dark'
                      ? 'rgba(25, 118, 210, 0.2)'
                      : 'rgba(25, 118, 210, 0.15)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(25, 118, 210, 0.3)' 
                      : 'rgba(25, 118, 210, 0.4)'}`,
                    borderRadius: '50%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover:not(:disabled)': {
                      transform: 'scale(1.1)',
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(25, 118, 210, 0.3)'
                        : 'rgba(25, 118, 210, 0.25)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 4px 16px rgba(25, 118, 210, 0.4)'
                        : '0 4px 16px rgba(25, 118, 210, 0.3)',
                    },
                    '&:disabled': {
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.05)',
                      border: `1px solid ${theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'rgba(0, 0, 0, 0.1)'}`,
                      opacity: 0.5,
                    }
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </CommentActionContext.Provider>
      </CommentDataContext.Provider>
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
    <CommentDataContext.Provider value={dataContextValue}>
      <CommentActionContext.Provider value={commentData}>
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
              src={currentUser?.userImageUrl || undefined}
              imgProps={{ crossOrigin: 'anonymous' }}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
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
              {(!currentUser?.userImageUrl || currentUser?.userImageUrl === '') && 
                `${currentUser?.userName?.[0] || 'U'}${currentUser?.userLastName?.[0] || ''}`}
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
    </CommentActionContext.Provider>
  </CommentDataContext.Provider>
  );
};

CommentTreeComponent.displayName = 'CommentTree';

export default CommentTreeComponent;
