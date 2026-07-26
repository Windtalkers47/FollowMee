import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { GradientPresetKey } from '../../styles/liquidGlassStyles';

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
  const baseStyles: SxProps<Theme> = {
    backgroundColor: 'background.paper',
    backgroundImage: 'none',
    borderRadius: 4,
    border: (theme) => `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
    transition: 'border-color .18s ease, background-color .18s ease',
    position: 'relative',
    overflow: 'hidden',
    ...(elevateOnHover && {
      '&:hover': {
        borderColor: onClick ? 'primary.main' : 'divider',
        backgroundColor: onClick ? 'action.hover' : 'background.paper',
      },
    }),
    ...(onClick && { cursor: 'pointer' }),
    ...sx,
  };

  return (
    <Box sx={baseStyles} className={className} onClick={onClick} data-gradient-preset={gradientPreset} data-dark-mode={isDarkMode || undefined}>
      {children}
    </Box>
  );
};

export default LiquidGlassCard;
