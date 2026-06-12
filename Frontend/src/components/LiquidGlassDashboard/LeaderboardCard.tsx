import React from 'react';
import { Box, Typography, Avatar, SxProps, Theme, LinearProgress } from '@mui/material';
import { LiquidGlassCard } from './LiquidGlassCard';
import { LeaderboardItem } from '../../services/api/dashboardApi';
import { GradientPresetKey } from '../../styles/liquidGlassStyles';

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

  const getRankColor = (rank: number) => {
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
        p: 3,
        ...sx,
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        🏆 Leaderboard
      </Typography>

      {/* Top Performers */}
      <Box mb={3}>
        {topPerformers.map((performer, index) => (
          <Box
            key={performer.userId}
            display="flex"
            alignItems="center"
            mb={index < topPerformers.length - 1 ? 2 : 0}
            p={1.5}
            sx={{
              borderRadius: 2,
              background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                transform: 'translateX(4px)',
              },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                bgcolor: getRankColor(performer.rank),
                color: performer.rank <= 3 ? '#000' : isDarkMode ? '#fff' : '#000',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              {getRankBadge(performer.rank)}
            </Box>
            <Avatar
              src={performer.userImageUrl}
              alt={`${performer.userName} ${performer.userLastName}`}
              sx={{ width: 40, height: 40, mr: 2 }}
            >
              {performer.userName.charAt(0)}
            </Avatar>
            <Box flex={1}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: isDarkMode ? '#fff' : '#1a1a1a',
                }}
              >
                {performer.userName} {performer.userLastName}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
              >
                {performer.completedTasks} tasks completed
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: getRankColor(performer.rank),
              }}
            >
              {performer.score} pts
            </Typography>
          </Box>
        ))}
      </Box>

      {/* My Rank */}
      <Box
        p={2}
        sx={{
          borderRadius: 2,
          background: isDarkMode ? 'rgba(100, 181, 246, 0.1)' : 'rgba(100, 181, 246, 0.05)',
          border: `1px solid ${isDarkMode ? 'rgba(100, 181, 246, 0.3)' : 'rgba(100, 181, 246, 0.2)'}`,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Your Rank: #{myRank.rank}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {myRank.score} pts
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" mb={0.5}>
          <LinearProgress
            variant="determinate"
            value={myRank.progressToNext}
            sx={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: myRank.progressToNext === 100 ? '#4caf50' : '#64b5f6',
                borderRadius: 4,
              },
            }}
          />
          <Typography variant="caption" sx={{ ml: 1, minWidth: 40 }}>
            {myRank.progressToNext}%
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
        >
          {myRank.completedTasks} tasks completed
        </Typography>
      </Box>
    </LiquidGlassCard>
  );
};

export default LeaderboardCard;