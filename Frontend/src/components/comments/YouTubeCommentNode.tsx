import React from 'react';
import { Avatar, Typography, IconButton, Box, Button, useTheme, TextField } from '@mui/material';
import { Reply as ReplyIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import { useCommentActionContext } from '../../contexts/index';
import { useAppSelector } from '../../store/store';
import { selectCurrentUser } from '../../store/slices/authSlice';

// Custom MentionTextarea component with glass-morphism styling for @mentions
const MentionTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  theme: any;
}> = ({ value, onChange, placeholder, theme }) => {
  const renderText = (text: string) => {
    const mentionRegex = /@(\w+\s*\w*)/g;
    const parts = text.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (part && part.startsWith('@')) {
        return (
          <span
            key={index}
            style={{
              background: theme.palette.mode === 'dark'
                ? 'rgba(25, 118, 210, 0.3)'
                : 'rgba(25, 118, 210, 0.2)',
              color: theme.palette.mode === 'dark'
                ? '#fff'
                : '#fff',
              padding: '3px 8px',
              borderRadius: '6px',
              margin: '0 2px',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: `1px solid ${theme.palette.mode === 'dark'
                ? 'rgba(25, 118, 210, 0.5)'
                : 'rgba(25, 118, 210, 0.4)'}`,
              fontWeight: 600,
              fontSize: '13px',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 2px 8px rgba(25, 118, 210, 0.3)'
                : '0 2px 8px rgba(25, 118, 210, 0.2)',
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: '8px',
        background: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid ${theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.15)'
          : 'rgba(255, 255, 255, 0.4)'}`,
        outline: 'none',
        resize: 'vertical',
        minHeight: '60px',
        fontFamily: 'inherit',
        lineHeight: '1.4',
        fontSize: '14px',
        color: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.8)',
      }}
      contentEditable
      suppressContentEditableWarning={true}
      onInput={(e: React.FormEvent<HTMLDivElement>) => {
        const newText = e.currentTarget.textContent || '';
        onChange({ target: { value: newText } } as React.ChangeEvent<HTMLTextAreaElement>);
      }}
    >
      {value ? renderText(value) : <span style={{ color: 'gray' }}>{placeholder}</span>}
    </div>
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
        <Avatar 
          src={displayUser?.userImageUrl}
          imgProps={{ crossOrigin: 'anonymous' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target) target.src = '';
          }}
          sx={{ 
            width: 32, 
            height: 32,
            flexShrink: 0,
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
          {(!displayUser?.userImageUrl || displayUser.userImageUrl === '') && displayUser?.userName?.[0]}
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
            {/* Like, Dislike, Reply, Collapse/Expand buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Glass Like button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => updateReaction(comment.comment.commentId, 'like')}
                  sx={{ 
                    p: 0.5,
                    background: comment.comment.reactions?.some(r => r.reactionType === 'like' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(25, 118, 210, 0.2)'
                        : 'rgba(25, 118, 210, 0.15)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(25, 118, 210, 0.3)' 
                      : 'rgba(25, 118, 210, 0.4)'}`,
                    '&:hover': {
                      background: comment.comment.reactions?.some(r => r.reactionType === 'like' && r.userId === currentUser?.userId)
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(25, 118, 210, 0.3)'
                          : 'rgba(25, 118, 210, 0.25)'
                        : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.8)',
                    }
                  }}
                >
                  <span>👍</span>
                </IconButton>
                {likeCount > 0 && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontSize: '12px',
                      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)',
                      fontWeight: 500,
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.8)',
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
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
                    p: 0.5,
                    background: comment.comment.reactions?.some(r => r.reactionType === 'dislike' && r.userId === currentUser?.userId)
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(158, 158, 158, 0.2)'
                        : 'rgba(158, 158, 158, 0.15)'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(158, 158, 158, 0.3)' 
                      : 'rgba(158, 158, 158, 0.4)'}`,
                    '&:hover': {
                      background: comment.comment.reactions?.some(r => r.reactionType === 'dislike' && r.userId === currentUser?.userId)
                        ? theme.palette.mode === 'dark'
                          ? 'rgba(158, 158, 158, 0.3)'
                          : 'rgba(158, 158, 158, 0.25)'
                        : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.8)',
                    }
                  }}
                >
                  <span>👎</span>
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
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
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
                    flexShrink: 0,
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
