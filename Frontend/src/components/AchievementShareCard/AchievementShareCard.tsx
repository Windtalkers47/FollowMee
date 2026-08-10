import React from 'react';
import { Avatar, Box, Typography, useTheme } from '@mui/material';

export type AchievementShareFormat = 'square' | 'story';

export interface AchievementShareEntry {
  userName: string;
  userLastName: string;
  userImageUrl?: string;
  score: number;
  rank: 1 | 2 | 3;
}

interface Props {
  entry: AchievementShareEntry;
  seasonLabel: string;
  format: AchievementShareFormat;
  pointsLabel: string;
  brandLabel: string;
  recognitionLabel: string;
}

const medalForRank = { 1: '🥇', 2: '🥈', 3: '🥉' } as const;
const accentForRank = { 1: '#d69b16', 2: '#8b93a4', 3: '#b86f3c' } as const;

const AchievementShareCard = React.forwardRef<HTMLDivElement, Props>(function AchievementShareCard(
  { entry, seasonLabel, format, pointsLabel, brandLabel, recognitionLabel },
  ref,
) {
  const theme = useTheme();
  const isStory = format === 'story';
  const accent = accentForRank[entry.rank];

  return (
    <Box
      ref={ref}
      data-testid={`achievement-share-${format}`}
      sx={{
        width: 540,
        height: isStory ? 960 : 540,
        position: 'relative',
        overflow: 'hidden',
        color: '#241b2a',
        background: `radial-gradient(circle at 50% 18%, ${accent}36 0, transparent 34%), linear-gradient(145deg, #fffdf9 0%, #f2eafb 52%, #e7daf4 100%)`,
        display: 'grid',
        placeItems: 'center',
        p: isStory ? '112px 54px' : '48px',
        boxSizing: 'border-box',
        isolation: 'isolate',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 22,
          borderRadius: isStory ? 46 : 38,
          border: '1px solid rgba(255,255,255,.82)',
          boxShadow: 'inset 0 0 0 1px rgba(92,62,111,.08), 0 30px 90px rgba(76,45,93,.18)',
          background: 'rgba(255,255,255,.38)',
          backdropFilter: 'blur(18px)',
          zIndex: -1,
        },
      }}
    >
      <Box sx={{ textAlign: 'center', width: '100%', maxWidth: 420 }}>
        <Typography sx={{ letterSpacing: '.22em', textTransform: 'uppercase', fontSize: 14, fontWeight: 800, color: '#6e5579' }}>
          {brandLabel}
        </Typography>
        <Box sx={{ my: isStory ? 7 : 3.5, position: 'relative', display: 'inline-grid', placeItems: 'center' }}>
          <Box sx={{ position: 'absolute', width: 190, height: 190, borderRadius: '50%', background: `${accent}28`, filter: 'blur(28px)' }} />
          <Avatar
            src={entry.userImageUrl}
            alt={`${entry.userName} ${entry.userLastName}`}
            sx={{ width: 132, height: 132, border: `6px solid ${accent}`, boxShadow: `0 0 0 8px #ffffffcc, 0 22px 50px ${accent}55`, fontSize: 44, fontWeight: 900 }}
          >
            {entry.userName.slice(0, 1)}
          </Avatar>
          <Box sx={{ position: 'absolute', bottom: -28, fontSize: 54, filter: `drop-shadow(0 8px 12px ${accent}55)` }}>
            {medalForRank[entry.rank]}
          </Box>
        </Box>
        <Typography sx={{ fontSize: isStory ? 42 : 34, lineHeight: 1.08, fontWeight: 950, overflowWrap: 'anywhere' }}>
          {entry.userName} {entry.userLastName}
        </Typography>
        <Typography sx={{ mt: 2, color: '#6e5579', fontSize: 20, fontWeight: 700 }}>{seasonLabel}</Typography>
        <Typography sx={{ mt: isStory ? 5 : 3, color: accent, fontSize: isStory ? 58 : 46, lineHeight: 1, fontWeight: 950 }}>
          #{entry.rank}
        </Typography>
        <Typography sx={{ mt: 1.5, color: '#4d3b57', fontSize: 20, fontWeight: 750 }}>{pointsLabel}</Typography>
      </Box>
      <Typography sx={{ position: 'absolute', bottom: isStory ? 54 : 30, color: '#786680', fontSize: 13, letterSpacing: '.12em' }}>
        {recognitionLabel}
      </Typography>
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(120deg, transparent 20%, ${theme.palette.common.white}55 43%, transparent 58%)`, opacity: .45 }} />
    </Box>
  );
});

export default AchievementShareCard;
