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
        <Box
          display="flex"
          flexWrap="wrap"
          alignItems="center"
          gap={1}
          sx={{
            mt: 'auto',
          }}
        >
          {trend && (
            <Chip
              label={trend.value}
              size="small"
              sx={{
                bgcolor: trend.isPositive ? 'rgba(52, 199, 89, 0.14)' : 'rgba(255, 59, 48, 0.14)',
                color: trend.isPositive ? 'success.main' : 'error.main',
                fontWeight: 600,
                fontSize: '0.7rem',
                border: '1px solid',
                borderColor: trend.isPositive ? 'success.main' : 'error.main',
                height: 24,
              }}
            />
          )}
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                fontSize: '0.8rem',
                lineHeight: 1.4,
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
