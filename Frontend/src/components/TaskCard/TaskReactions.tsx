import React from 'react';
import { Box, IconButton, Stack, useTheme } from '@mui/material';
import { TaskLikeSummary } from '../../api/task.api';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { gradientPresets } from '../../styles/liquidGlassStyles';

interface TaskReactionsProps {
  taskId: string;
  likeSummary?: TaskLikeSummary;
  onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => void;
  onUnlike?: (taskId: string) => void;
  onCommentToggle: () => void;
  showComments: boolean;
}

const REACTIONS = [
  { type: 'like' as const, emoji: '👍', color: 'primary' as const, darkBg: 'rgba(76, 175, 80, 0.2)', lightBg: 'rgba(25, 118, 210, 0.15)', darkBorder: 'rgba(76, 175, 80, 0.3)', lightBorder: 'rgba(25, 118, 210, 0.4)' },
  { type: 'love' as const, emoji: '❤️', color: 'error' as const, darkBg: 'rgba(239, 68, 68, 0.2)', lightBg: 'rgba(239, 68, 68, 0.15)', darkBorder: 'rgba(239, 68, 68, 0.3)', lightBorder: 'rgba(239, 68, 68, 0.4)' },
  { type: 'laugh' as const, emoji: '😂', color: 'warning' as const, darkBg: 'rgba(245, 158, 11, 0.2)', lightBg: 'rgba(245, 158, 11, 0.15)', darkBorder: 'rgba(245, 158, 11, 0.3)', lightBorder: 'rgba(245, 158, 11, 0.4)' },
  { type: 'angry' as const, emoji: '😠', color: 'error' as const, darkBg: 'rgba(220, 38, 38, 0.2)', lightBg: 'rgba(220, 38, 38, 0.15)', darkBorder: 'rgba(220, 38, 38, 0.3)', lightBorder: 'rgba(220, 38, 38, 0.4)' },
  { type: 'wow' as const, emoji: '😮', color: 'info' as const, darkBg: 'rgba(59, 130, 246, 0.2)', lightBg: 'rgba(59, 130, 246, 0.15)', darkBorder: 'rgba(59, 130, 246, 0.3)', lightBorder: 'rgba(59, 130, 246, 0.4)' },
  { type: 'sad' as const, emoji: '😢', color: 'secondary' as const, darkBg: 'rgba(156, 163, 175, 0.2)', lightBg: 'rgba(156, 163, 175, 0.15)', darkBorder: 'rgba(156, 163, 175, 0.3)', lightBorder: 'rgba(156, 163, 175, 0.4)' },
];

const TaskReactions: React.FC<TaskReactionsProps> = ({
  taskId,
  likeSummary,
  onLike,
  onUnlike,
  onCommentToggle,
  showComments,
}) => {
  const theme = useTheme();
  const { liquidGlassSettings } = useLiquidGlass();
  const preset = gradientPresets[liquidGlassSettings.gradientPreset];
  const userLike = likeSummary?.userLike;

  const getReactionStyle = (isActive: boolean, reaction: typeof REACTIONS[0]) => {
    const isDark = theme.palette.mode === 'dark';
    const inactiveBg = isDark 
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.5))';
    const inactiveBorder = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.6)';
    const hoverBg = isDark 
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.12))'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6))';
    
    return {
      p: 0.6,
      minWidth: 32,
      width: 32,
      height: 32,
      borderRadius: '10px',
      background: isActive ? (isDark ? reaction.darkBg : reaction.lightBg) : inactiveBg,
      backdropFilter: 'blur(10px) saturate(180%)',
      WebkitBackdropFilter: 'blur(10px) saturate(180%)',
      border: `1px solid ${isActive ? (isDark ? reaction.darkBorder : reaction.lightBorder) : inactiveBorder}`,
      boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.08)',
      '&:hover': {
        background: isActive 
          ? (isDark ? reaction.darkBg.replace('0.2', '0.3') : reaction.lightBg.replace('0.15', '0.25'))
          : hoverBg,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transform: 'translateY(-2px) scale(1.1)',
      },
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isActive ? 'scale(1.1)' : 'scale(1)',
    };
  };

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {REACTIONS.map((reaction) => {
        const isActive = userLike === reaction.type;
        
        return (
          <IconButton
            key={reaction.type}
            size="small"
            onClick={() => isActive 
              ? onUnlike?.(taskId) 
              : onLike?.(taskId, reaction.type)}
            color={isActive ? reaction.color : 'default'}
            sx={getReactionStyle(isActive, reaction)}
          >
            <span>{reaction.emoji}</span>
          </IconButton>
        );
      })}

      {/* Comment Button - Liquid Glass Style */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
        <IconButton
          size="small"
          onClick={onCommentToggle}
          sx={{
            p: 0.6,
            minWidth: 32,
            width: 32,
            height: 32,
            borderRadius: '10px',
            background: showComments 
              ? preset.light
              : `linear-gradient(135deg, rgba(255, 255, 255, ${theme.palette.mode === 'dark' ? '0.15' : '0.7'}), rgba(255, 255, 255, ${theme.palette.mode === 'dark' ? '0.08' : '0.5'}))`,
            backdropFilter: 'blur(10px) saturate(180%)',
            WebkitBackdropFilter: 'blur(10px) saturate(180%)',
            border: `1px solid ${showComments 
              ? (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.6)')
              : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.6)')}`,
            boxShadow: showComments 
              ? '0 2px 8px rgba(0, 0, 0, 0.15)'
              : '0 2px 6px rgba(0, 0, 0, 0.08)',
            '&:hover': {
              background: showComments 
                ? preset.light.replace('0.25', '0.35')
                : `linear-gradient(135deg, rgba(255, 255, 255, ${theme.palette.mode === 'dark' ? '0.2' : '0.8'}), rgba(255, 255, 255, ${theme.palette.mode === 'dark' ? '0.12' : '0.6'}))`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-2px) scale(1.1)',
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: showComments ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <span>💬</span>
        </IconButton>
      </Box>
    </Stack>
  );
};

export default React.memo(TaskReactions);
