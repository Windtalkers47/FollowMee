import React from 'react';
import { Avatar, Typography, IconButton, Box, Button } from '@mui/material';
import { 
  ThumbUp as LikeIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import { useCommentDataContext, useCommentActionContext } from '../../contexts/index';

interface ThreadedCommentNodeProps {
  row: FlatCommentRow;
}

const ThreadedCommentNodeComponent = React.memo<ThreadedCommentNodeProps>(({ row }) => {
  const { comment } = row;
  
  // Use the new separated contexts
  const { collapsedThreads } = useCommentDataContext();
  const {
    handleReply,
    handleReplyTextChange,
    handleReplySubmit,
    handleEditStart,
    handleEditSubmit,
    handleEditCancel,
    handleDeleteComment,
    updateReaction,
    replyingTo,
    editingComment,
    editText,
    setEditText,
    getReplyText,
    toggleCollapse
  } = useCommentActionContext();

  // For now, we'll need to pass these as props or get them from a parent provider
  const currentUserId = 0; // This should come from auth context

  const isCollapsed = collapsedThreads.has(comment.comment.commentId);
  const isEditing = editingComment === comment.comment.commentId;
  const isOwner = currentUserId === comment.comment.user?.userId;
  const isEdited = comment.comment.updatedAt && new Date(comment.comment.updatedAt) > new Date(comment.comment.createdAt);
  
  const displayUser = comment.comment.user || { userName: 'Unknown', userLastName: 'User', userId: 0, userImageUrl: undefined };
  const hasChildren = (comment.comment._count?.replies ?? 0) > 0;

  // Count reactions by type
  const getReactionCount = (type: string) => {
    return comment.comment.reactions?.filter(r => r.type === type).length || 0;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Modern comment card with enhanced styling */}
      <Box
        sx={{
          backgroundColor: '#ffffff',
          borderRadius: 2.5,
          p: 2.5,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          '&:hover': {
            borderColor: 'rgba(0, 0, 0, 0.12)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.06)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        {/* Header with user info and timestamp */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar 
            src={displayUser?.userImageUrl}
            sx={{ 
              width: 40, 
              height: 40,
              border: currentUserId === displayUser?.userId 
                ? '3px solid rgba(25, 118, 210, 0.3)' 
                : '2px solid rgba(0, 0, 0, 0.08)',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {displayUser?.userImageUrl ? '' : (
              displayUser?.userName?.[0]?.toUpperCase() ?? displayUser?.userLastName?.[0]?.toUpperCase() ?? 'U'
            )}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography 
                variant="body2" 
                fontWeight="700"
                sx={{ 
                  color: 'text.primary', 
                  fontSize: '15px',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}
              >
                {displayUser?.userName} {displayUser?.userLastName}
              </Typography>
              
              {isOwner && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    backgroundColor: 'primary.main', 
                    color: 'primary.contrastText', 
                    px: 1, 
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    boxShadow: '0 1px 3px rgba(25, 118, 210, 0.3)'
                  }}
                >
                  You
                </Typography>
              )}
              
              {isEdited && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '11px',
                    fontStyle: 'italic',
                    opacity: 0.8
                  }}
                >
                  edited
                </Typography>
              )}
            </Box>
            
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontSize: '12px',
                opacity: 0.7,
                fontWeight: 500
              }}
            >
              {format(new Date(comment.comment.createdAt), 'MMM d, yyyy • h:mm a')}
            </Typography>
          </Box>
        </Box>

        {/* Comment content */}
        <Box sx={{ mb: 2.5 }}>
          {isEditing ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEditSubmit(comment.comment.commentId);
                    }
                  }}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px 16px',
                    border: '2px solid rgba(25, 118, 210, 0.2)',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.5
                  }}
                  autoFocus
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton
                  onClick={() => handleEditSubmit(comment.comment.commentId)}
                  size="small"
                  sx={{ 
                    color: 'primary.main',
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    '&:hover': { 
                      backgroundColor: 'rgba(25, 118, 210, 0.12)',
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={handleEditCancel}
                  size="small"
                  sx={{ 
                    color: 'text.secondary',
                    backgroundColor: 'rgba(0, 0, 0, 0.06)',
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 0, 0, 0.12)',
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  ×
                </IconButton>
              </Box>
            </Box>
          ) : (
            <Typography 
              variant="body1"
              sx={{ 
                fontSize: '16px',
                lineHeight: 1.7,
                color: 'text.primary',
                wordBreak: 'break-word',
                fontWeight: 400
              }}
            >
              {comment.comment.comment}
            </Typography>
          )}
        </Box>

        {/* Enhanced action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Simple YouTube-style like button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <IconButton
                size="small"
                onClick={() => updateReaction(comment.comment.commentId, 'like')}
                sx={{ 
                  color: comment.comment.reactions?.some(r => r.type === 'like') ? 'primary.main' : 'text.secondary',
                  padding: '4px',
                  borderRadius: '50%', // Circular like YouTube
                  '&:hover': { 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <LikeIcon fontSize="small" />
              </IconButton>
              {getReactionCount('like') > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '12px',
                    color: 'text.secondary',
                    ml: 0.5
                  }}
                >
                  {getReactionCount('like')}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Reply button */}
          <Button
            size="small"
            onClick={() => handleReply(comment.comment.commentId)}
            sx={{ 
              textTransform: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: 'text.secondary',
              padding: '6px 12px',
              minWidth: 'auto',
              borderRadius: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                borderColor: 'rgba(0, 0, 0, 0.12)',
                color: 'text.primary',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.15s ease'
            }}
          >
            Reply
          </Button>

          {/* Owner actions */}
          {isOwner && (
            <>
              <Button
                size="small"
                onClick={() => handleEditStart(comment.comment.commentId, comment.comment.comment)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'text.secondary',
                  padding: '6px 12px',
                  minWidth: 'auto',
                  borderRadius: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    color: 'text.primary',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.15s ease'
                }}
              >
                Edit
              </Button>
              <Button
                size="small"
                onClick={() => handleDeleteComment(comment.comment.commentId)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'error.main',
                  padding: '6px 12px',
                  minWidth: 'auto',
                  borderRadius: 2,
                  backgroundColor: 'rgba(211, 47, 47, 0.04)',
                  border: '1px solid rgba(211, 47, 47, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(211, 47, 47, 0.08)',
                    borderColor: 'rgba(211, 47, 47, 0.12)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.15s ease'
                }}
              >
                Delete
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Enhanced reply input */}
      {replyingTo === comment.comment.commentId && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)', 
            borderRadius: 2.5, 
            p: 2,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  fontSize: '14px',
                  fontWeight: 600,
                  border: '2px solid rgba(0, 0, 0, 0.08)'
                }}
              >
                U
              </Avatar>
              <Box flex={1}>
                <textarea
                  placeholder={`Replying to ${displayUser?.userName}...`}
                  value={getReplyText(comment.comment.commentId)}
                  onChange={(e) => handleReplyTextChange(comment.comment.commentId, e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReplySubmit(comment.comment.commentId);
                    }
                  }}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '12px 16px',
                    border: '2px solid rgba(25, 118, 210, 0.15)',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.5,
                    backgroundColor: '#ffffff'
                  }}
                  autoFocus
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    onClick={() => handleReplySubmit(comment.comment.commentId)}
                    variant="contained"
                    sx={{ 
                      textTransform: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '8px 16px',
                      borderRadius: 2,
                      boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
                      '&:hover': {
                        boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Reply
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleReply(comment.comment.commentId)}
                    sx={{ 
                      textTransform: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'text.secondary',
                      padding: '8px 16px',
                      borderRadius: 2,
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.08)',
                        borderColor: 'rgba(0, 0, 0, 0.12)'
                      },
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Enhanced show hidden replies button */}
      {hasChildren && isCollapsed && (
        <Box sx={{ mt: 2 }}>
          <Button
            onClick={() => toggleCollapse(comment.comment.commentId)}
            sx={{ 
              textTransform: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: 'primary.main',
              padding: '8px 16px',
              borderRadius: 2.5,
              backgroundColor: 'rgba(25, 118, 210, 0.06)',
              border: '1px solid rgba(25, 118, 210, 0.15)',
              boxShadow: '0 1px 3px rgba(25, 118, 210, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                borderColor: 'rgba(25, 118, 210, 0.25)',
                boxShadow: '0 2px 6px rgba(25, 118, 210, 0.15)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.15s ease'
            }}
            startIcon={
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: '14px',
                mr: 0.5,
                transition: 'transform 0.15s ease'
              }}>
                ▶
              </Box>
            }
          >
            Show {(comment.comment._count?.replies ?? 0)} hidden {(comment.comment._count?.replies ?? 0) === 1 ? "reply" : "replies"}
          </Button>
        </Box>
      )}
    </Box>
  );
});

ThreadedCommentNodeComponent.displayName = 'ThreadedCommentNode';

// Custom comparison function for effective memoization
const areEqual = (prev: ThreadedCommentNodeProps, next: ThreadedCommentNodeProps) => {
  // Compare comment ID and essential properties
  return (
    prev.row.comment.comment.commentId === next.row.comment.comment.commentId &&
    prev.row.depth === next.row.depth &&
    prev.row.isLastChild === next.row.isLastChild &&
    prev.row.isFirstChild === next.row.isFirstChild
  );
};

export default React.memo(ThreadedCommentNodeComponent, areEqual);
