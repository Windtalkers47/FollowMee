import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { gradientPresets, GradientPresetKey } from '../../styles/liquidGlassStyles';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  gradientPreset?: GradientPresetKey;
  isDarkMode?: boolean;
  elevateOnHover?: boolean;
  className?: string;
  onClick?: () => void;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  sx = {},
  gradientPreset = 'freshGreen',
  isDarkMode = false,
  elevateOnHover = true,
  className,
  onClick,
}) => {
  const preset = gradientPresets[gradientPreset];
  const gradient = isDarkMode ? preset.dark : preset.light;

  const baseStyles: SxProps<Theme> = {
    background: gradient,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    backgroundColor: isDarkMode ? 'rgba(30, 30, 40, 0.7)' : 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(100, 181, 246, 0.6), transparent)',
      opacity: 0.7,
    },
    ...(elevateOnHover && {
      '&:hover': {
        transform: 'translateY(-5px) scale(1.02)',
        boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
      },
    }),
    ...sx,
  };

  return (
    <Box sx={baseStyles} className={className} onClick={onClick}>
      {children}
    </Box>
  );
};

export default LiquidGlassCard;