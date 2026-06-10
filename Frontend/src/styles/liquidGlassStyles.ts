/**
 * Liquid Glass UI Styles
 * iOS-inspired glassmorphism design with accessibility options
 * Apple-alike Theme Presets
 */

// Theme Presets - Apple-alike Style with 10 themes
export const gradientPresets = {
  classicBluePurple: {
    name: 'Classic Blue-Purple',
    light: 'linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.25))',
    dark: 'linear-gradient(135deg, rgba(102, 126, 234, 0.35), rgba(118, 75, 162, 0.35))',
    border: 'linear-gradient(135deg, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5))',
    primary: '#4a6cf7',
    secondary: '#a64dff',
  },
  pinkPeach: {
    name: 'Pink Peach',
    light: 'linear-gradient(135deg, rgba(251, 194, 235, 0.25), rgba(252, 213, 206, 0.25))',
    dark: 'linear-gradient(135deg, rgba(251, 194, 235, 0.35), rgba(252, 213, 206, 0.35))',
    border: 'linear-gradient(135deg, rgba(251, 194, 235, 0.5), rgba(252, 213, 206, 0.5))',
    primary: '#f472b6',
    secondary: '#fca5a5',
  },
  warmLight: {
    name: 'Warm Light',
    light: 'linear-gradient(135deg, rgba(219, 190, 254, 0.25), rgba(224, 242, 254, 0.25))',
    dark: 'linear-gradient(135deg, rgba(219, 190, 254, 0.35), rgba(224, 242, 254, 0.35))',
    border: 'linear-gradient(135deg, rgba(219, 190, 254, 0.5), rgba(224, 242, 254, 0.5))',
    primary: '#3b82f6',
    secondary: '#0ea5e9',
  },
  freshGreen: {
    name: 'Fresh Green',
    light: 'linear-gradient(135deg, rgba(209, 250, 229, 0.25), rgba(236, 253, 245, 0.25))',
    dark: 'linear-gradient(135deg, rgba(209, 250, 229, 0.35), rgba(236, 253, 245, 0.35))',
    border: 'linear-gradient(135deg, rgba(209, 250, 229, 0.5), rgba(236, 253, 245, 0.5))',
    primary: '#10b981',
    secondary: '#34d399',
  },
  skyBlue: {
    name: 'Sky Blue',
    light: 'linear-gradient(135deg, rgba(224, 242, 254, 0.25), rgba(240, 249, 255, 0.25))',
    dark: 'linear-gradient(135deg, rgba(224, 242, 254, 0.35), rgba(240, 249, 255, 0.35))',
    border: 'linear-gradient(135deg, rgba(224, 242, 254, 0.5), rgba(240, 249, 255, 0.5))',
    primary: '#0284c7',
    secondary: '#38bdf8',
  },
  oceanBlue: {
    name: 'Ocean Blue',
    light: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))',
    dark: 'linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(139, 92, 246, 0.35))',
    border: 'linear-gradient(135deg, rgba(99, 102, 241, 0.5), rgba(139, 92, 246, 0.5))',
    primary: '#6366f1',
    secondary: '#a855f7',
  },
  sunset: {
    name: 'Sunset',
    light: 'linear-gradient(135deg, rgba(255, 81, 47, 0.25), rgba(221, 36, 118, 0.25))',
    dark: 'linear-gradient(135deg, rgba(255, 81, 47, 0.35), rgba(221, 36, 118, 0.35))',
    border: 'linear-gradient(135deg, rgba(255, 81, 47, 0.5), rgba(221, 36, 118, 0.5))',
    primary: '#ef4444',
    secondary: '#ec4899',
  },
  darkRed: {
    name: 'Dark Red',
    light: 'linear-gradient(135deg, rgba(59, 10, 10, 0.25), rgba(127, 29, 29, 0.25))',
    dark: 'linear-gradient(135deg, rgba(59, 10, 10, 0.35), rgba(127, 29, 29, 0.35))',
    border: 'linear-gradient(135deg, rgba(59, 10, 10, 0.5), rgba(127, 29, 29, 0.5))',
    primary: '#dc2626',
    secondary: '#991b1b',
  },
  darkPurple: {
    name: 'Dark Purple',
    light: 'linear-gradient(135deg, rgba(30, 41, 59, 0.25), rgba(51, 65, 85, 0.25))',
    dark: 'linear-gradient(135deg, rgba(30, 41, 59, 0.35), rgba(51, 65, 85, 0.35))',
    border: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(51, 65, 85, 0.5))',
    primary: '#7c3aed',
    secondary: '#5b21b6',
  },
  dark: {
    name: 'Dark',
    light: 'linear-gradient(135deg, rgba(15, 23, 42, 0.25), rgba(30, 41, 59, 0.25))',
    dark: 'linear-gradient(135deg, rgba(15, 23, 42, 0.35), rgba(30, 41, 59, 0.35))',
    border: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(30, 41, 59, 0.5))',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
  },
};

export type GradientPresetKey = keyof typeof gradientPresets;

// Accessibility Settings Type
export interface LiquidGlassSettings {
  gradientPreset: GradientPresetKey;
  reduceTransparency: boolean;
  increaseContrast: boolean;
  addBorders: boolean;
}

// Default Settings - Fresh Green as default for iOS-like feel
export const defaultLiquidGlassSettings: LiquidGlassSettings = {
  gradientPreset: 'freshGreen',
  reduceTransparency: false,
  increaseContrast: false,
  addBorders: true,
};

// Glass Card Styles
export const getGlassCardStyles = (
  settings: LiquidGlassSettings,
  isDarkMode: boolean = false,
  isProminent: boolean = false,
  rankIndex?: number
) => {
  const preset = gradientPresets[settings.gradientPreset];
  const gradient = isDarkMode ? preset.dark : preset.light;
  const borderGradient = preset.border;

  // Determine opacity based on settings
  const bgOpacity = settings.reduceTransparency ? 0.95 : 0.7;
  const blurStrength = settings.reduceTransparency ? 8 : 20;

  // Border settings
  const borderWidth = settings.addBorders ? 1 : 0;
  const borderColor = settings.increaseContrast 
    ? isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)'
    : isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)';

  // Shadow settings
  const shadowOpacity = settings.increaseContrast ? 0.2 : 0.1;
  const shadowBlur = isProminent ? 20 : 12;

  // Rank-based border highlight
  const rankBorderColors = {
    0: 'linear-gradient(135deg, #FFD700, #FFA500)', // Gold for #1
    1: 'linear-gradient(135deg, #C0C0C0, #E8E8E8)', // Silver for #2
    2: 'linear-gradient(135deg, #CD7F32, #E4A07B)', // Bronze for #3
  };

  return {
    background: gradient,
    backdropFilter: `blur(${blurStrength}px)`,
    WebkitBackdropFilter: `blur(${blurStrength}px)`,
    backgroundColor: isDarkMode 
      ? `rgba(30, 30, 40, ${bgOpacity})` 
      : `rgba(255, 255, 255, ${bgOpacity})`,
    borderRadius: 16,
    border: `${borderWidth}px solid ${borderColor}`,
    boxShadow: `0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0, 0, 0, ${shadowOpacity})`,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    ...(rankIndex !== undefined && rankIndex < 3 && {
      borderTop: `3px solid ${rankIndex === 0 ? '#FFD700' : rankIndex === 1 ? '#C0C0C0' : '#CD7F32'}`,
    }),
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: `0 ${shadowBlur + 8}px ${shadowBlur * 2 + 16}px rgba(0, 0, 0, ${shadowOpacity + 0.1})`,
    },
  };
};

// Glass Input Styles
export const getGlassInputStyles = (
  settings: LiquidGlassSettings,
  isDarkMode: boolean = false
) => {
  const preset = gradientPresets[settings.gradientPreset];
  const gradient = isDarkMode ? preset.dark : preset.light;
  const bgOpacity = settings.reduceTransparency ? 0.98 : 0.8;
  const blurStrength = settings.reduceTransparency ? 8 : 16;

  return {
    background: gradient,
    backdropFilter: `blur(${blurStrength}px)`,
    WebkitBackdropFilter: `blur(${blurStrength}px)`,
    backgroundColor: isDarkMode 
      ? `rgba(40, 40, 50, ${bgOpacity})` 
      : `rgba(255, 255, 255, ${bgOpacity})`,
    borderRadius: 16,
    border: settings.addBorders 
      ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.5)'}`
      : 'none',
    boxShadow: settings.increaseContrast
      ? '0 4px 12px rgba(0, 0, 0, 0.15)'
      : '0 4px 12px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.2s ease',
    '&:focus': {
      boxShadow: settings.increaseContrast
        ? '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 0 3px rgba(74, 108, 247, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.12), 0 0 0 3px rgba(74, 108, 247, 0.2)',
    },
  };
};

// Glass Button Styles
export const getGlassButtonStyles = (
  settings: LiquidGlassSettings,
  isDarkMode: boolean = false,
  variant: 'contained' | 'outlined' | 'text' = 'contained'
) => {
  const preset = gradientPresets[settings.gradientPreset];
  const bgOpacity = settings.reduceTransparency ? 0.95 : 0.85;

  if (variant === 'contained') {
    return {
      background: preset.light,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 12,
      border: settings.addBorders ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
      },
      '&:active': {
        transform: 'translateY(0)',
      },
    };
  }

  if (variant === 'outlined') {
    return {
      background: 'transparent',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: 12,
      border: `2px solid ${isDarkMode ? preset.border : preset.border}`,
      boxShadow: 'none',
      transition: 'all 0.2s ease',
      '&:hover': {
        background: isDarkMode ? preset.dark : preset.light,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    };
  }

  return {
    background: 'transparent',
    borderRadius: 8,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
  };
};

// iOS-style Segmented Control Styles
export const getSegmentedControlStyles = (
  settings: LiquidGlassSettings,
  isDarkMode: boolean = false
) => {
  const preset = gradientPresets[settings.gradientPreset];
  const bgOpacity = settings.reduceTransparency ? 0.95 : 0.8;

  return {
    background: isDarkMode 
      ? `rgba(50, 50, 60, ${bgOpacity})` 
      : `rgba(230, 230, 235, ${bgOpacity})`,
    backdropFilter: `blur(${settings.reduceTransparency ? 8 : 16}px)`,
    WebkitBackdropFilter: `blur(${settings.reduceTransparency ? 8 : 16}px)`,
    borderRadius: 12,
    padding: 4,
    border: settings.addBorders 
      ? `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`
      : 'none',
    '& .MuiTab-root': {
      borderRadius: 8,
      minHeight: 36,
      transition: 'all 0.2s ease',
      '&.Mui-selected': {
        background: preset.light,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        fontWeight: 600,
      },
    },
  };
};

// Text Color Adjustments for Dark Mode
export const getTextColorStyles = (
  isDarkMode: boolean,
  increaseContrast: boolean,
  variant: 'primary' | 'secondary' | 'tertiary' = 'primary'
) => {
  if (!isDarkMode) {
    return {
      primary: '#1a1a1a',
      secondary: '#4a4a4a',
      tertiary: '#6a6a6a',
    }[variant];
  }

  // Dark mode text colors
  const darkModeColors = {
    primary: increaseContrast ? '#ffffff' : '#f0f0f0',
    secondary: increaseContrast ? '#e0e0e0' : '#c0c0c0',
    tertiary: increaseContrast ? '#b0b0b0' : '#909090',
  };

  return darkModeColors[variant];
};

// Responsive Breakpoints
export const responsiveBreakpoints = {
  mobile: '@media (max-width: 599px)',
  tablet: '@media (min-width: 600px) and (max-width: 1023px)',
  desktop: '@media (min-width: 1024px)',
  iPad: '@media (min-width: 768px) and (max-width: 1024px)',
};

// Generate responsive styles for cards
export const getResponsiveCardStyles = () => ({
  mobile: {
    padding: 12,
    borderRadius: 12,
    '& .MuiTypography-h4': {
      fontSize: '1.5rem',
    },
    '& .MuiTypography-h6': {
      fontSize: '0.9rem',
    },
    '& .MuiTypography-body2': {
      fontSize: '0.75rem',
    },
  },
  tablet: {
    padding: 16,
    borderRadius: 14,
  },
  desktop: {
    padding: 20,
    borderRadius: 16,
  },
});