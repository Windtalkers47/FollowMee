import React from 'react';
import { Box, Typography, SxProps, Theme } from '@mui/material';
import { LiquidGlassCard } from './LiquidGlassCard';
import { LeaderboardItem } from '../../services/api/dashboardApi';
import { GradientPresetKey } from '../../styles/liquidGlassStyles';
import { EmojiEvents } from '@mui/icons-material';
import SmartAvatar from '../../components/SmartAvatar';
import { brandColors } from '../../styles/designTokens';

interface LeaderboardCardProps {
  topPerformers: LeaderboardItem[];
  myRank: {
    rank: number;
    score: number;
    progressToNext: number;
    completedTasks: number;
  };
  gradientPreset?: GradientPresetKey;
  isDarkMode?: boolean;
  sx?: SxProps<Theme>;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  topPerformers,
  myRank,
  gradientPreset = 'freshGreen',
  isDarkMode = false,
  sx = {},
}) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getGradientBg = (rank: number) => {
    if (rank === 1) return 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 193, 7, 0.05))';
    if (rank === 2) return 'linear-gradient(135deg, rgba(192, 192, 192, 0.15), rgba(169, 169, 169, 0.05))';
    if (rank === 3) return 'linear-gradient(135deg, rgba(205, 127, 50, 0.15), rgba(184, 115, 51, 0.05))';
    return isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  };

  const getBorderColor = (rank: number) => {
    if (rank === 1) return 'rgba(255, 215, 0, 0.5)';
    if (rank === 2) return 'rgba(192, 192, 192, 0.5)';
    if (rank === 3) return 'rgba(205, 127, 50, 0.5)';
    return isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  };

  const getRankNumberColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  };

  return (
    <LiquidGlassCard
      gradientPreset={gradientPreset}
      isDarkMode={isDarkMode}
      sx={{
        p: { xs: 2, sm: 3 },
        ...sx,
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <EmojiEvents sx={{ color: 'primary.main', fontSize: 24 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkMode ? '#fff' : '#1a1a1a' }}>
          Leaderboard
        </Typography>
      </Box>

      {/* Top Performers */}
      <Box mb={3}>
        {topPerformers.map((performer, index) => (
          <Box
            key={performer.userId}
            display="flex"
            alignItems="center"
            mb={index < topPerformers.length - 1 ? 2 : 0}
            p={2}
            sx={{
              borderRadius: 3,
              background: getGradientBg(performer.rank),
              border: `1px solid ${getBorderColor(performer.rank)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateX(8px)',
                boxShadow: performer.rank <= 3 
                  ? `0 8px 20px ${getBorderColor(performer.rank).replace('0.5', '0.3')}`
                  : isDarkMode 
                    ? '0 8px 20px rgba(255,255,255,0.1)' 
                    : '0 8px 20px rgba(0,0,0,0.1)',
              },
            }}
          >
            {/* Rank Badge */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                background: performer.rank <= 3 
                  ? `linear-gradient(135deg, ${getRankNumberColor(performer.rank)}, ${getRankNumberColor(performer.rank).replace('0.8', '0.6')})`
                  : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                boxShadow: performer.rank <= 3 ? `0 4px 12px ${getRankNumberColor(performer.rank)}40` : 'none',
                fontSize: '1rem',
              }}
            >
              {getRankBadge(performer.rank)}
            </Box>

            {/* Avatar */}
            <SmartAvatar
              user={{
                userName: performer.userName,
                userLastName: performer.userLastName,
                userImageUrl: performer.userImageUrl,
              }}
              avatarVariant="glass"
              size={44}
              sx={{
                mr: 2,
                border: performer.rank <= 3 ? `2px solid ${getRankNumberColor(performer.rank)}` : 'none',
                boxShadow: performer.rank <= 3 ? `0 2px 8px ${getRankNumberColor(performer.rank)}60` : 'none',
              }}
            />

            {/* Info */}
            <Box flex={1} minWidth={0}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: isDarkMode ? '#fff' : '#1a1a1a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {performer.userName} {performer.userLastName}
              </Typography>
              <Typography
                variant="caption"
                sx={{ 
                  color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  fontSize: '0.75rem',
                }}
              >
                {performer.completedTasks} tasks completed
              </Typography>
            </Box>

            {/* Score */}
            <Box textAlign="right">
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: getRankNumberColor(performer.rank),
                  fontSize: '1rem',
                }}
              >
                {performer.score}
              </Typography>
              <Typography
                variant="caption"
                sx={{ 
                  color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                  fontSize: '0.7rem',
                }}
              >
                pts
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* My Rank */}
      <Box
        p={2.5}
        sx={{
          borderRadius: 3,
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.18), rgba(52, 199, 89, 0.04))'
            : 'linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(52, 199, 89, 0.02))',
          border: `1px solid ${isDarkMode ? 'rgba(48, 209, 88, 0.4)' : 'rgba(52, 199, 89, 0.3)'}`,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDarkMode ? '#fff' : '#1a1a1a' }}>
              Your Rank: #{myRank.rank}
            </Typography>
            {myRank.rank <= 3 && <span>{getRankBadge(myRank.rank)}</span>}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1.1rem' }}>
            {myRank.score} pts
          </Typography>
        </Box>
        
        {/* Progress Bar */}
        <Box display="flex" alignItems="center" mb={1}>
          <Box
            sx={{
              flex: 1,
              height: 10,
              borderRadius: 5,
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${Math.min(myRank.progressToNext, 100)}%`,
                background: myRank.progressToNext === 100 
                  ? `linear-gradient(90deg, ${brandColors.iosGreen}, ${brandColors.iosGreenDark})`
                  : `linear-gradient(90deg, ${brandColors.blue}, ${brandColors.indigo})`,
                borderRadius: 5,
                transition: 'width 0.5s ease',
              }}
            />
          </Box>
          <Typography 
            variant="caption" 
            sx={{ 
              ml: 1.5, 
              minWidth: 45,
              fontWeight: 600,
              color: myRank.progressToNext === 100 ? brandColors.iosGreen : brandColors.blue,
            }}
          >
            {myRank.progressToNext}%
          </Typography>
        </Box>
        
        <Typography
          variant="caption"
          sx={{ 
            color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
            display: 'block',
          }}
        >
          {myRank.completedTasks} tasks completed
        </Typography>
      </Box>
    </LiquidGlassCard>
  );
};

export default LeaderboardCard;
