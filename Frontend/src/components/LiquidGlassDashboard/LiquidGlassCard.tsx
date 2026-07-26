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

  const baseStyles: SxProps<Theme> = {
    backgroundColor: isDarkMode ? '#171C1A' : '#FFFFFF',
    backgroundImage: `radial-gradient(circle at 100% 0%, ${preset.primary}18, transparent 42%)`,
    borderRadius: '20px',
    border: (theme) => `1px solid ${theme.palette.divider}`,
    boxShadow: isDarkMode
      ? '0 16px 40px rgba(0,0,0,.18)'
      : '0 14px 34px rgba(35,65,45,.07)',
    transition: 'box-shadow .22s ease, border-color .22s ease, transform .22s ease',
    position: 'relative',
    overflow: 'hidden',
    ...(elevateOnHover && {
      '&:hover': {
        transform: onClick ? 'translateY(-2px)' : 'none',
        borderColor: `${preset.primary}42`,
        boxShadow: isDarkMode
          ? '0 20px 46px rgba(0,0,0,.26)'
          : '0 18px 42px rgba(35,65,45,.11)',
      },
    }),
    ...(onClick && { cursor: 'pointer' }),
    ...sx,
  };

  return (
    <Box sx={baseStyles} className={className} onClick={onClick}>
      {children}
    </Box>
  );
};

export default LiquidGlassCard;
