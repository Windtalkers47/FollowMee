import React from 'react';
import { Box, Typography, Avatar, Chip, SxProps, Theme } from '@mui/material';
import { LiquidGlassCard } from './LiquidGlassCard';
import { GradientPresetKey } from '../../styles/liquidGlassStyles';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  gradientPreset?: GradientPresetKey;
  isDarkMode?: boolean;
  sx?: SxProps<Theme>;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  subtitle,
  gradientPreset = 'freshGreen',
  isDarkMode = false,
  sx = {},
}) => {
  return (
    <LiquidGlassCard
      gradientPreset={gradientPreset}
      isDarkMode={isDarkMode}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 3,
        ...sx,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            gutterBottom
            sx={{
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            component="div"
            sx={{
              fontWeight: 700,
              color: isDarkMode ? '#fff' : '#1a1a1a',
            }}
          >
            {value}
          </Typography>
        </Box>
        <Avatar
          sx={{
            bgcolor: `${color}20`,
            color: color,
            width: 48,
            height: 48,
          }}
        >
          {icon}
        </Avatar>
      </Box>

      {(trend || subtitle) && (
        <Box>
          {trend && (
            <Chip
              label={trend.value}
              size="small"
              sx={{
                bgcolor: trend.isPositive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                color: trend.isPositive ? '#4caf50' : '#f44336',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: `1px solid ${trend.isPositive ? '#4caf50' : '#f44336'}`,
              }}
            />
          )}
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                ml: 1,
                color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
    </LiquidGlassCard>
  );
};

export default StatCard;