import React from 'react';
import { Avatar, Typography, IconButton, Box, Button } from '@mui/material';
import { 
  ThumbUp as LikeIcon, 
  Favorite as LoveIcon, 
  SentimentVerySatisfied as LaughIcon, 
  ThumbDown as AngryIcon,
  Comment as CommentIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import { ThreadColumn } from './ThreadColumn';
import { useCommentDataContext, useCommentActionContext } from '../../contexts/index';

interface ThreadedCommentNodeProps {
  row: FlatCommentRow;
}

const ThreadedCommentNodeComponent = React.memo<ThreadedCommentNodeProps>(({ row }) => {
  const { comment, depth, isLastChild, parentPath , isFirstChild } = row;
  
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
    replyTextByCommentId,
    newCommentText,
    editingComment,
    editText,
    setNewCommentText,
    setEditText,
    getReplyText,
    toggleCollapse
  } = useCommentActionContext();

  // For now, we'll need to pass these as props or get them from a parent provider
  const currentUserId = 0; // This should come from auth context
  const theme = { palette: { background: { paper: 'white' }, mode: 'light' } }; // This should come from theme context

  const isCollapsed = collapsedThreads.has(comment.comment.commentId);
  const isEditing = editingComment === comment.comment.commentId;
  const isOwner = currentUserId === comment.comment.user?.userId;
  const isEdited = comment.comment.updatedAt && new Date(comment.comment.updatedAt) > new Date(comment.comment.createdAt);
  
  const displayUser = comment.comment.user || { userName: 'Unknown', userLastName: 'User', userId: 0, userImageUrl: undefined };
  const hasChildren = (comment.comment._count?.replies ?? 0) > 0;

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Parent columns */}
      {parentPath.map((showLine, i) => (
        <Box
          key={i}
          sx={{
            width: 24,
            position: "relative",
            flexShrink: 0
          }}
        >
          {showLine && (
            <Box
              sx={{
                position: "absolute",
                left: 11,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: "rgba(0,0,0,0.15)"
              }}
            />
          )}
        </Box>
      ))}

      {/* Current column */}
      <ThreadColumn
        showLine={depth > 0}
        isConnector={depth > 0}
        isLastChild={isLastChild}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        onToggle={() => toggleCollapse(comment.comment.commentId)}
      />

      {/* Comment body */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Comment Card */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, position: 'relative' }}>
          <Avatar 
            src={displayUser?.userImageUrl}
            sx={{ 
              width: 40, 
              height: 40,
              border: currentUserId === displayUser?.userId 
                ? '2px solid rgba(25, 118, 210, 0.5)' 
                : '2px solid rgba(0, 0, 0, 0.1)',
            }}
          >
            {displayUser?.userImageUrl ? '' : (
              displayUser?.userName?.[0]?.toUpperCase() ?? displayUser?.userLastName?.[0]?.toUpperCase() ?? 'U'
            )}
          </Avatar>
          
          <Box
            sx={{
              flex: 1,
              backgroundColor: depth > 0 ? 'rgba(0, 0, 0, 0.02)' : '#ffffff',
              borderRadius: 1.5,
              p: 2,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: depth > 0 ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'rgba(0, 0, 0, 0.12)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)'
              }
            }}
          >
            {/* User info and timestamp */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
              <Typography 
                variant="body2" 
                fontWeight="600"
                sx={{ color: 'text.primary', fontSize: '13px' }}
              >
                {displayUser?.userName} {displayUser?.userLastName}
              </Typography>
              {isOwner && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    backgroundColor: 'primary.main', 
                    color: 'primary.contrastText', 
                    px: 0.75, 
                    py: 0.25,
                    borderRadius: 0.5,
                    fontSize: '10px',
                    fontWeight: 500
                  }}
                >
                  You
                </Typography>
              )}
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '12px' }}
              >
                {format(new Date(comment.comment.createdAt), 'MMM d, yyyy • h:mm a')}
              </Typography>
              {isEdited && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '11px', fontStyle: 'italic' }}
                >
                  edited
                </Typography>
              )}
            </Box>

            {/* Comment content */}
            {isEditing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText?.(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px'
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => handleEditCancel?.()}>
                    Cancel
                  </IconButton>
                  <IconButton size="small" onClick={() => handleEditSubmit?.(comment.comment.commentId)}>
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  mb: 1.5, 
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: 'text.primary'
                }}
              >
                {comment.comment.comment}
              </Typography>
            )}

            {/* Actions */}
            {!isEditing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                {/* Reactions */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => updateReaction?.(comment.comment.commentId, 'like')}
                    sx={{ 
                      fontSize: '12px',
                      padding: '4px',
                      borderRadius: '4px',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <LikeIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => updateReaction?.(comment.comment.commentId, 'love')}
                    sx={{ 
                      fontSize: '12px',
                      padding: '4px',
                      borderRadius: '4px',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <LoveIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => updateReaction?.(comment.comment.commentId, 'laugh')}
                    sx={{ 
                      fontSize: '12px',
                      padding: '4px',
                      borderRadius: '4px',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <LaughIcon fontSize="inherit" />
                  </IconButton>
                </Box>

                {/* Reply */}
                <Button 
                  size="small" 
                  onClick={() => handleReply?.(comment.comment.commentId)}
                  sx={{ 
                    fontSize: '12px',
                    textTransform: 'none',
                    fontWeight: 500,
                    color: 'text.secondary',
                    padding: '4px 8px',
                    minWidth: 'auto',
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      color: 'text.primary'
                    }
                  }}
                >
                  Reply
                </Button>

                {/* Edit/Delete for owner */}
                {isOwner && (
                  <>
                    <Button 
                      size="small" 
                      onClick={() => handleEditStart?.(comment.comment.commentId, comment.comment.comment)}
                      sx={{ 
                        fontSize: '12px',
                        textTransform: 'none',
                        fontWeight: 500,
                        color: 'text.secondary',
                        padding: '4px 8px',
                        minWidth: 'auto',
                        '&:hover': { 
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          color: 'text.primary'
                        }
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => handleDeleteComment?.(comment.comment.commentId)}
                      sx={{ 
                        fontSize: '12px',
                        textTransform: 'none',
                        fontWeight: 500,
                        color: 'text.secondary',
                        padding: '4px 8px',
                        minWidth: 'auto',
                        '&:hover': { 
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          color: 'error.main'
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Reply input */}
            {replyingTo === comment.comment.commentId && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <textarea
                  value={getReplyText?.(comment.comment.commentId) || ''}
                  onChange={(e) => handleReplyTextChange?.(comment.comment.commentId, e.target.value)}
                  placeholder="Write a reply..."
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px'
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleReplySubmit?.(comment.comment.commentId)}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Collapse indicator */}
        {hasChildren && isCollapsed && (
          <Box 
            sx={{ 
              ml: 7, 
              mt: 1, 
              p: 1, 
              backgroundColor: 'rgba(0, 0, 0, 0.05)', 
              borderRadius: 1,
              cursor: 'pointer',
              fontSize: '12px',
              color: 'text.secondary'
            }}
            onClick={() => toggleCollapse(comment.comment.commentId)}
          >
            Show {(comment.comment._count?.replies ?? 0)} hidden {((comment.comment._count?.replies ?? 0) === 1) ? "reply" : "replies"}
          </Box>
        )}
      </Box>
    </Box>
  );
});

ThreadedCommentNodeComponent.displayName = 'ThreadedCommentNode';

export default ThreadedCommentNodeComponent;
