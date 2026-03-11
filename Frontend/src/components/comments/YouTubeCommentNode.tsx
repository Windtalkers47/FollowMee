import React from 'react';
import { Avatar, Typography, IconButton, Box, Button } from '@mui/material';
import { Reply as ReplyIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import { useCommentActionContext } from '../../contexts/index';

interface YouTubeCommentNodeProps {
  row: FlatCommentRow;
}

const YouTubeCommentNode: React.FC<YouTubeCommentNodeProps> = ({ row }) => {
  const { updateReaction, handleReply, handleReplySubmit, handleReplyCancel, handleEditStart, handleDeleteComment, replyingTo, getReplyText, handleReplyTextChange, toggleCollapse, collapsedThreads } = useCommentActionContext();
  
  const { comment } = row;
  const currentUserId = 0; // This should come from auth context
  const isOwner = currentUserId === comment.comment.user?.userId;
  const isEdited = comment.comment.updatedAt && new Date(comment.comment.updatedAt) > new Date(comment.comment.createdAt);
  
  const displayUser = comment.comment.user || { userName: 'Unknown', userLastName: 'User', userId: 0, userImageUrl: undefined };
  const likeCount = comment.comment.reactions?.filter(r => r.reactionType === 'like').length || 0;
  const dislikeCount = comment.comment.reactions?.filter(r => r.reactionType === 'dislike').length || 0;

  return (
    <Box sx={{ 
      position: 'relative',
      mb: 1,
      '&:hover .comment-actions': {
        opacity: 1
      }
    }}>
      {/* YouTube-style comment container */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1.5,
        py: 1,
        px: 0,
        transition: 'background-color 0.2s ease',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.02)'
        }
      }}>
        {/* Avatar */}
        <Avatar 
          src={displayUser?.userImageUrl}
          sx={{ 
            width: 32, 
            height: 32,
            flexShrink: 0,
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          {displayUser?.userName?.[0]}
        </Avatar>

        {/* Comment content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* User info and timestamp */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontSize: '13px', 
                fontWeight: 600,
                color: 'text.primary'
              }}
            >
              {displayUser.userName} {displayUser.userLastName}
            </Typography>
            
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '12px', 
                color: 'text.secondary',
                ml: 0.5
              }}
            >
              • {format(new Date(comment.comment.createdAt), 'MMM d, yyyy')}
              {isEdited && ' (edited)'}
            </Typography>
          </Box>

          {/* Comment text */}
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '14px',
              lineHeight: 1.5,
              color: 'text.primary',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {comment.comment.comment}
          </Typography>

          {/* Action buttons */}
          <Box 
            className="comment-actions"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              mt: 1,
              opacity: 0.7,
              transition: 'opacity 0.2s ease'
            }}
          >
            {/* Like button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => updateReaction(comment.comment.commentId, 'like')}
                sx={{ 
                  padding: '4px',
                  borderRadius: '50%',
                  color: comment.comment.reactions?.some(r => r.reactionType === 'like' && r.userId === currentUserId) ? 'primary.main' : 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                👍
              </IconButton>
              {likeCount > 0 && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: '12px',
                    color: 'text.secondary',
                    fontWeight: 500
                  }}
                >
                  {likeCount}
                </Typography>
              )}
            </Box>

            {/* Dislike button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => updateReaction(comment.comment.commentId, 'dislike')}
                sx={{ 
                  padding: '4px',
                  borderRadius: '50%',
                  color: comment.comment.reactions?.some(r => r.reactionType === 'dislike' && r.userId === currentUserId) ? 'error.main' : 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                👎
              </IconButton>
              {dislikeCount > 0 && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: '12px',
                    color: 'text.secondary',
                    fontWeight: 500
                  }}
                >
                  {dislikeCount}
                </Typography>
              )}
            </Box>

            {/* Reply button */}
            <Button
              size="small"
              startIcon={<ReplyIcon sx={{ fontSize: '16px' }} />}
              onClick={() => handleReply(comment.comment.commentId)}
              sx={{ 
                textTransform: 'none',
                fontSize: '13px',
                fontWeight: 500,
                color: 'text.secondary',
                padding: '4px 8px',
                minWidth: 'auto',
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              Reply
            </Button>

            {/* Collapse/Expand thread button */}
            {row.hasChildren && (
              <Button
                size="small"
                onClick={() => toggleCollapse(comment.comment.commentId)}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'text.secondary',
                  padding: '4px 8px',
                  minWidth: 'auto',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                {collapsedThreads.has(comment.comment.commentId)
                  ? '▼ View replies'
                  : '▲ Hide replies'}
              </Button>
            )}

            {/* Owner actions */}
            {isOwner && (
              <>
                <Button
                  size="small"
                  onClick={() => handleEditStart(comment.comment.commentId, comment.comment.comment)}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'text.secondary',
                    padding: '4px 8px',
                    minWidth: 'auto',
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
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
                    fontWeight: 500,
                    color: 'error.main',
                    padding: '4px 8px',
                    minWidth: 'auto',
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(211, 47, 47, 0.04)'
                    }
                  }}
                >
                  Delete
                </Button>
              </>
            )}
          </Box>

          {/* Reply input area */}
          {replyingTo === comment.comment.commentId && (
            <Box sx={{ mt: 2, pl: 0 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {currentUserId ? 'U' : 'G'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <textarea
                    value={getReplyText(comment.comment.commentId)}
                    onChange={(e) => handleReplyTextChange(comment.comment.commentId, e.target.value)}
                    placeholder="Add a public reply..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: 'rgba(0, 0, 0, 0.8)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: '60px',
                      fontFamily: 'inherit',
                      lineHeight: '1.4'
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => handleReplySubmit(comment.comment.commentId)}
                      sx={{ 
                        textTransform: 'none',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    >
                      Reply
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleReplyCancel()}
                      sx={{ 
                        textTransform: 'none',
                        fontSize: '13px',
                        color: 'text.secondary'
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default YouTubeCommentNode;
