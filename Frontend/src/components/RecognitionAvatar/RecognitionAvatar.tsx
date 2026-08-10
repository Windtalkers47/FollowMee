import React from 'react';
import { Box, Tooltip, useMediaQuery } from '@mui/material';
import SmartAvatar, { type AvatarUser } from '../SmartAvatar/SmartAvatar';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

export interface Recognition {
  auraKey?: string;
  rankValue?: 1 | 2 | 3;
  badgeKey?: string;
}

interface Props {
  user: AvatarUser;
  recognition?: Recognition;
  size?: number;
}

const colors = {
  1: { edge: '#f2b72b', glow: 'rgba(242,183,43,.52)', medal: '🥇' },
  2: { edge: '#aab2c2', glow: 'rgba(170,178,194,.48)', medal: '🥈' },
  3: { edge: '#cd7f4f', glow: 'rgba(205,127,79,.48)', medal: '🥉' },
} as const;

export default function RecognitionAvatar({ user, recognition, size = 34 }: Props) {
  const { profileCardMotion, t } = useUserPreferences();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const finePointer = useMediaQuery('(pointer: fine)');
  const rank = recognition?.rankValue;
  const palette = rank ? colors[rank] : undefined;
  const animate = Boolean(palette && finePointer && !reduceMotion && profileCardMotion !== 'off');
  const label = rank ? t('feature.rankAura', { rank }) : '';

  const avatar = (
    <Box
      component="span"
      aria-label={label || undefined}
      sx={{
        width: size + 8,
        height: size + 8,
        display: 'inline-grid',
        placeItems: 'center',
        position: 'relative',
        flex: '0 0 auto',
        borderRadius: '50%',
        ...(palette ? {
          background: `conic-gradient(from 30deg, ${palette.edge}, #fff7cf, ${palette.edge})`,
          boxShadow: `0 0 0 2px rgba(255,255,255,.8), 0 0 15px ${palette.glow}`,
          transition: 'box-shadow 180ms ease, transform 180ms ease',
          '@keyframes recognitionAura': {
            '0%, 100%': { boxShadow: `0 0 0 2px rgba(255,255,255,.8), 0 0 12px ${palette.glow}` },
            '50%': { boxShadow: `0 0 0 2px rgba(255,255,255,.9), 0 0 23px ${palette.glow}` },
          },
          '&:hover': animate ? { animation: 'recognitionAura 1.4s ease-in-out infinite', transform: 'translateY(-1px)' } : undefined,
        } : undefined),
      }}
    >
      <SmartAvatar user={user} avatarVariant="glass" size={size} />
      {palette && <Box component="span" aria-hidden sx={{ position: 'absolute', right: -5, bottom: -5, fontSize: 15, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' }}>{palette.medal}</Box>}
    </Box>
  );

  return label ? <Tooltip title={label}>{avatar}</Tooltip> : avatar;
}
