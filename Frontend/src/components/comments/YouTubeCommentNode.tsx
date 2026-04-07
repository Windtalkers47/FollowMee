import React from 'react';
import { Typography, IconButton, Box, Button, useTheme, TextField } from '@mui/material';
import { format } from 'date-fns';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import { useCommentActionContext } from '../../contexts/index';
import { useAppSelector } from '../../store/store';
import { selectCurrentUser } from '../../store/slices/authSlice';
import SmartAvatar from '../SmartAvatar';

// Simple textarea component for comment input
const MentionTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  theme: any;
}> = ({ value, onChange, placeholder, theme }) => {
  return (
    <TextField
      multiline
      fullWidth
      minRows={2}
      maxRows={6}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      variant="outlined"
      size="small"
      sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: `1px solid ${theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(255, 255, 255, 0.4)'}`,
          borderRadius: '8px',
          '& fieldset': {
            borderColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255, 255, 255, 0.4)',
          },
          '&:hover fieldset': {
            borderColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.25)'
              : 'rgba(255, 255, 255, 0.6)',
          },
          '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
          },
        },
        '& .MuiOutlinedInput-input': {
          color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.8)',
          fontSize: '14px',
          lineHeight: '1.4',
          fontFamily: 'inherit',
        },
      }}
    />
  );
};

interface YouTubeCommentNodeProps {
  row: FlatCommentRow;
}

const YouTubeCommentNode: React.FC<YouTubeCommentNodeProps> = ({ row }) => {
  const context = useCommentActionContext();
  const { updateReaction, handleReply, handleReplySubmit, handleReplyCancel, handleEditStart, handleEditSubmit, handleEditCancel, handleDeleteComment, replyingTo, getReplyText, handleReplyTextChange, toggleCollapse, collapsedThreads, editingComment, editText, setEditText } = context;
  const theme = useTheme();
  const currentUser = useAppSelector(selectCurrentUser);
  
  const { comment, depth } = row;
  const isOwner = currentUser?.userId === comment.comment.user?.userId;
  const isEdited = comment.comment.updatedAt && new Date(comment.comment.updatedAt) > new Date(comment.comment.createdAt);
  
  // Check if this comment is at maximum depth (depth 2 means parent -> reply -> this comment)
  const isAtMaxDepth = depth >= 2;
  
  // Check if this comment is collapsed
  const isCollapsed = collapsedThreads.has(comment.comment.commentId);
  const hasChildrenInOriginal = comment.comment.replies && comment.comment.replies.length > 0;
  
  // Glass morphism presets
  const glassOpacity = 0.7;
  const finalOpacity = glassOpacity;
  const finalBlur = 20;
  const finalBorderOpacity = 0.3;
  
  const displayUser = isOwner && currentUser 
    ? currentUser 
    : comment.comment.user || { userName: 'Unknown', userLastName: 'User', userId: 0, userImageUrl: undefined };
  const likeCount = comment.comment.reactions?.filter(r => r.reactionType === 'like').length || 0;
  const loveCount = comment.comment.reactions?.filter(r => r.reactionType === 'love').length || 0;
  const laughCount = comment.comment.reactions?.filter(r => r.reactionType === 'laugh').length || 0;
  const angryCount = comment.comment.reactions?.filter(r => r.reactionType === 'angry').length || 0;
  const wowCount = comment.comment.reactions?.filter(r => r.reactionType === 'wow').length || 0;
  const sadCount = comment.comment.reactions?.filter(r => r.reactionType === 'sad').length || 0;

  return (
    <Box sx={{ 
      position: 'relative',
      mb: 1,
      '&:hover .comment-actions': {
        opacity: 1
      }
    }}>
      {/* Glass-style comment container */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1.5,
        py: 1,
        px: 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateX(2px)',
        }
      }}>
        {/* Glass Avatar */}
        <SmartAvatar 
          user={displayUser}
          avatarVariant="glass"
          size={32}
        />

        {/* Comment content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* User info and timestamp */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontSize: '13px', 
                fontWeight: 600,
                color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.8)',
                textShadow: theme.palette.mode === 'dark' 
                  ? '0 1px 2px rgba(0, 0, 0, 0.3)' 
                  : '0 1px 2px rgba(255, 255, 255, 0.5)',
              }}
            >
              {displayUser.userName} {displayUser.userLastName}
            </Typography>
            
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '12px', 
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                ml: 0.5
              }}
            >
              • {format(new Date(comment.comment.createdAt), 'MMM d, yyyy')}
              {isEdited && ' (edited)'}
            </Typography>
          </Box>

          {/* Comment text or edit form */}
          <Box sx={{
            background: theme.palette.mode === 'dark' 
              ? `rgba(255, 255, 255, ${finalOpacity * 0.08})`
              : `rgba(255, 255, 255, ${finalOpacity * 0.6})`,
            backdropFilter: `blur(${finalBlur}px) saturate(180%)`,
            WebkitBackdropFilter: `blur(${finalBlur}px) saturate(180%)`,
            border: `1px solid ${theme.palette.mode === 'dark' 
              ? `rgba(255, 255, 255, ${finalBorderOpacity * 0.15})` 
              : `rgba(255, 255, 255, ${finalBorderOpacity * 0.4})`}`,
            borderRadius: 2,
            p: 1.5,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: theme.palette.mode === 'dark'
                ? `0 4px 16px 0 rgba(0, 0, 0, ${0.3 * finalOpacity})`
                : `0 4px 16px 0 rgba(31, 38, 135, ${0.1 * finalOpacity})`,
            }
          }}>
            {editingComment === comment.comment.commentId ? (
              // Edit mode
              <Box>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
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
                    onClick={() => handleEditSubmit(comment.comment.commentId)}
                    sx={{ 
                      textTransform: 'none',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleEditCancel()}
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
            ) : (
              // Display mode
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.8)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {comment.comment.comment}
              </Typography>
            )}
          </Box>

          {/* Glass Action buttons */}
          <Box 
            className="comment-actions"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mt: 1.5,
              opacity: 0.8,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                opacity: 1,
              }
            }}
          >
            {/* Full Emotion Reactions - Like Love Laugh Angry Wow Sad */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              {/* Like */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <IconButton
                  size="small"
                  onClick={() => updateReaction(comment.comment.commentId, 'like')}
                  sx={{ 
                    p: 0.5,
                    background: comment.comment.reactions?.some(r => r.reactionType === 'like' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(76, 175, 80, 0.2)'
                        : 'rgba(25, 118, 210, 0.15)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(220, 38, 38, 0.12)'
                        : 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${comment.comment.reactions?.some(r => r.reactionType === 'like' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark' 
                        ? 'rgba(76, 175, 80, 0.3)' 
                        : 'rgba(25, 118, 210, 0.4)' 
                      : theme.palette.mode === 'dark' 
                        ? 'rgba(220, 38, 38, 0.2)' 
                        : 'rgba(255, 255, 255, 0.8)'}`,
                    '&:hover': {
                      background: comment.comment.reactions?.some(r => r.reactionType === 'like' && r.userId === currentUser?.userId)
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(76, 175, 80, 0.25)'
                          : 'rgba(25, 118, 210, 0.2)'
                        : theme.palette.mode === 'dark'
                          ? 'rgba(220, 38, 38, 0.15)'
                          : 'rgba(255, 255, 255, 0.12)',
                    }
                  }}
                >
                  <span>👍</span>
                </IconButton>
                {likeCount > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>
                    {likeCount}
                  </Typography>
                )}
              </Box>

              {/* Love */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <IconButton
                  size="small"
                  onClick={() => updateReaction(comment.comment.commentId, 'love')}
                  sx={{ 
                    p: 0.5,
                    background: comment.comment.reactions?.some(r => r.reactionType === 'love' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(239, 68, 68, 0.15)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${comment.comment.reactions?.some(r => r.reactionType === 'love' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark' 
                        ? 'rgba(239, 68, 68, 0.3)' 
                        : 'rgba(239, 68, 68, 0.4)' 
                      : theme.palette.mode === 'dark' 
                        ? 'rgba(220, 38, 38, 0.2)' 
                        : 'rgba(255, 255, 255, 0.8)'}`,
                    '&:hover': {
                      background: comment.comment.reactions?.some(r => r.reactionType === 'love' && r.userId === currentUser?.userId)
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(239, 68, 68, 0.3)'
                          : 'rgba(239, 68, 68, 0.25)'
                        : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.8)',
                    }
                  }}
                >
                  <span>❤️</span>
                </IconButton>
                {loveCount > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>
                    {loveCount}
                  </Typography>
                )}
              </Box>

              {/* Laugh */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <IconButton
                  size="small"
                  onClick={() => updateReaction(comment.comment.commentId, 'laugh')}
                  sx={{ 
                    p: 0.5,
                    background: comment.comment.reactions?.some(r => r.reactionType === 'laugh' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(245, 158, 11, 0.15)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${comment.comment.reactions?.some(r => r.reactionType === 'laugh' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark' 
                        ? 'rgba(245, 158, 11, 0.3)' 
                        : 'rgba(245, 158, 11, 0.4)' 
                      : theme.palette.mode === 'dark' 
                        ? 'rgba(220, 38, 38, 0.2)' 
                        : 'rgba(255, 255, 255, 0.8)'}`,
                    '&:hover': {
                      background: comment.comment.reactions?.some(r => r.reactionType === 'laugh' && r.userId === currentUser?.userId)
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(245, 158, 11, 0.25)'
                        : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.8)',
                    }
                  }}
                >
                  <span>😂</span>
                </IconButton>
                {laughCount > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>
                    {laughCount}
                  </Typography>
                )}
              </Box>

              {/* Angry */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <IconButton
                  size="small"
                  onClick={() => updateReaction(comment.comment.commentId, 'angry')}
                  sx={{ 
                    p: 0.5,
                    background: comment.comment.reactions?.some(r => r.reactionType === 'angry' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(220, 38, 38, 0.2)'
                        : 'rgba(220, 38, 38, 0.15)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${comment.comment.reactions?.some(r => r.reactionType === 'angry' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark' 
                        ? 'rgba(220, 38, 38, 0.3)' 
                        : 'rgba(220, 38, 38, 0.4)' 
                      : theme.palette.mode === 'dark' 
                        ? 'rgba(220, 38, 38, 0.2)' 
                        : 'rgba(255, 255, 255, 0.8)'}`,
                    '&:hover': {
                      background: comment.comment.reactions?.some(r => r.reactionType === 'angry' && r.userId === currentUser?.userId)
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(220, 38, 38, 0.3)'
                          : 'rgba(220, 38, 38, 0.25)'
                        : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.8)',
                    }
                  }}
                >
                  <span>😠</span>
                </IconButton>
                {angryCount > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>
                    {angryCount}
                  </Typography>
                )}
              </Box>

              {/* Wow */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <IconButton
                  size="small"
                  onClick={() => updateReaction(comment.comment.commentId, 'wow')}
                  sx={{ 
                    p: 0.5,
                    background: comment.comment.reactions?.some(r => r.reactionType === 'wow' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(59, 130, 246, 0.15)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${comment.comment.reactions?.some(r => r.reactionType === 'wow' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark' 
                        ? 'rgba(59, 130, 246, 0.3)' 
                        : 'rgba(59, 130, 246, 0.4)' 
                      : theme.palette.mode === 'dark' 
                        ? 'rgba(220, 38, 38, 0.2)' 
                        : 'rgba(255, 255, 255, 0.8)'}`,
                    '&:hover': {
                      background: comment.comment.reactions?.some(r => r.reactionType === 'wow' && r.userId === currentUser?.userId)
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(59, 130, 246, 0.25)'
                        : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.8)',
                    }
                  }}
                >
                  <span>😮</span>
                </IconButton>
                {wowCount > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>
                    {wowCount}
                  </Typography>
                )}
              </Box>

              {/* Sad */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <IconButton
                  size="small"
                  onClick={() => updateReaction(comment.comment.commentId, 'sad')}
                  sx={{ 
                    p: 0.5,
                    background: comment.comment.reactions?.some(r => r.reactionType === 'sad' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(156, 163, 175, 0.2)'
                        : 'rgba(156, 163, 175, 0.15)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${comment.comment.reactions?.some(r => r.reactionType === 'sad' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark' 
                        ? 'rgba(156, 163, 175, 0.3)' 
                        : 'rgba(156, 163, 175, 0.4)' 
                      : theme.palette.mode === 'dark' 
                        ? 'rgba(220, 38, 38, 0.2)' 
                        : 'rgba(255, 255, 255, 0.8)'}`,
                    '&:hover': {
                      background: comment.comment.reactions?.some(r => r.reactionType === 'sad' && r.userId === currentUser?.userId)
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(156, 163, 175, 0.3)'
                          : 'rgba(156, 163, 175, 0.25)'
                        : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.8)',
                    }
                  }}
                >
                  <span>😢</span>
                </IconButton>
                {sadCount > 0 && (
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500 }}>
                    {sadCount}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Action buttons - Reply, Collapse/Expand, Edit, Delete */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, flexWrap: 'wrap' }}>
              {/* Reply button */}
              <Button
                size="small"
                onClick={() => {
                  if (isAtMaxDepth) {
                    // For max depth, pre-fill the reply input with user tag
                    const taggedText = `@${displayUser.userName} ${displayUser.userLastName} `;
                    handleReply(comment.comment.commentId);
                    handleReplyTextChange(comment.comment.commentId, taggedText);
                  } else {
                    handleReply(comment.comment.commentId);
                  }
                }}
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
              {hasChildrenInOriginal && (
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
                  {isCollapsed ? '▼ View replies' : '▲ Hide replies'}
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
          </Box>

          {/* Reply input area */}
          {replyingTo === comment.comment.commentId && (
            <Box sx={{ mt: 2, pl: 0 }}>
              {isAtMaxDepth && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mb: 1, 
                    display: 'block',
                    color: 'text.secondary',
                    fontStyle: 'italic'
                  }}
                >
                  Replying will tag @{displayUser.userName} {displayUser.userLastName} instead of creating a nested reply
                </Typography>
              )}
              
              {/* Emotion Reaction Bar - Like The Thread */}
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <SmartAvatar 
                  user={currentUser}
                  avatarVariant="glass"
                  size={16}
                  sx={{
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(255, 255, 255, 0.8)'}`,
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 2px 6px rgba(0, 0, 0, 0.3)'
                      : '0 2px 6px rgba(31, 38, 135, 0.2)',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <MentionTextarea
                    value={getReplyText(comment.comment.commentId)}
                    onChange={(e) => {
                      const newText = e.target.value;
                      handleReplyTextChange(comment.comment.commentId, newText);
                    }}
                    placeholder={isAtMaxDepth ? "Write a reply with user tag..." : "Add a public reply..."}
                    theme={theme}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        const replyText = getReplyText(comment.comment.commentId);
                        if (replyText?.trim()) {
                          if (isAtMaxDepth) {
                            // For max depth replies, submit as a reply to the parent instead of this comment
                            const actualParentId = comment.comment.parentCommentId || 0;
                            handleReplySubmit(actualParentId, comment.comment.commentId);
                          } else {
                            handleReplySubmit(comment.comment.commentId);
                          }
                        }
                      }}
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
