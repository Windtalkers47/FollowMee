import React from 'react';
import { Avatar, AvatarProps, useTheme } from '@mui/material';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

interface SmartAvatarProps extends Omit<AvatarProps, 'children'> {
  user?: any;
  avatarVariant?: 'main' | 'glass';
  size?: number;
}

const SmartAvatar: React.FC<SmartAvatarProps> = ({ 
  user, 
  avatarVariant = 'main',
  size = 32,
  sx = {},
  ...props 
}) => {
  const theme = useTheme();

  const getInitials = () => {
    if (!user) return 'U';
    
    const firstName = user.userName || '';
    const lastName = user.userLastName || '';
    
    // Prioritize userName first
    if (firstName) {
      return firstName[0]?.toUpperCase() || 'U';
    }
    
    // If no userName, use userLastName
    if (lastName) {
      return lastName[0]?.toUpperCase() || 'U';
    }
    
    // Fallback to 'U' if neither is available
    return 'U';
  };

  const getAvatarStyles = () => {
    const baseStyles = {
      width: size,
      height: size,
    };

    if (avatarVariant === 'main') {
      return {
        ...baseStyles,
        bgcolor: user?.userImageUrl ? 'transparent' : theme.palette.primary.main,
        color: user?.userImageUrl ? 'transparent' : theme.palette.primary.contrastText,
        border: `2px solid ${theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper}`,
        boxShadow: theme.shadows[1],
        ...sx,
      };
    }

    if (avatarVariant === 'glass') {
      return {
        ...baseStyles,
        flexShrink: 0,
        bgcolor: user?.userImageUrl ? 'transparent' : (theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.2)' : 'rgba(33, 150, 243, 0.1)'),
        color: user?.userImageUrl ? 'transparent' : (theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2'),
        border: `2px solid ${theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.3)' 
          : 'rgba(255, 255, 255, 0.8)'}`,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 4px 12px rgba(0, 0, 0, 0.4)'
          : '0 4px 12px rgba(31, 38, 135, 0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        ...sx,
      };
    }

    return { ...baseStyles, ...sx };
  };

  return (
    <Avatar
      src={getOptimizedImageUrl(user?.userImageUrl, Math.max(size * 2, 64))}
      imgProps={{ crossOrigin: 'anonymous' }}
      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.target as HTMLImageElement;
        if (target) target.src = '';
      }}
      sx={getAvatarStyles()}
      {...props}
    >
      {(!user?.userImageUrl || user.userImageUrl === '') && getInitials()}
    </Avatar>
  );
};

export default SmartAvatar;
