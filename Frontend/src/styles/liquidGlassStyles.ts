/**
 * Liquid Glass UI Styles
 * iOS-inspired glassmorphism design with accessibility options
 * Apple-alike Theme Presets
 */

// Theme Presets - Apple-alike Style with 10 themes
export const gradientPresets = {
  classicBluePurple: {
    name: 'Classic Blue-Purple',
    light: 'rgba(231, 221, 240, 0.88)',
    dark: 'rgba(53, 42, 58, 0.92)',
    border: 'rgba(179, 158, 181, 0.55)',
    primary: '#72527C',
    secondary: '#8E7696',
  },
  pinkPeach: {
    name: 'Pink Peach',
    light: 'rgba(245, 228, 232, 0.9)',
    dark: 'rgba(69, 50, 57, 0.92)',
    border: 'rgba(234, 207, 214, 0.65)',
    primary: '#8C626D',
    secondary: '#A77B72',
  },
  warmLight: {
    name: 'Warm Light',
    light: 'rgba(238, 232, 242, 0.9)',
    dark: 'rgba(42, 35, 46, 0.92)',
    border: 'rgba(179, 158, 181, 0.5)',
    primary: '#72527C',
    secondary: '#6F8290',
  },
  freshGreen: {
    name: 'Fresh Green',
    light: 'rgba(229, 241, 231, 0.9)',
    dark: 'rgba(36, 48, 41, 0.92)',
    border: 'rgba(143, 175, 153, 0.55)',
    primary: '#466B52',
    secondary: '#668773',
  },
  skyBlue: {
    name: 'Sky Blue',
    light: 'rgba(232, 240, 242, 0.9)',
    dark: 'rgba(34, 45, 49, 0.92)',
    border: 'rgba(151, 176, 183, 0.55)',
    primary: '#536F78',
    secondary: '#718B92',
  },
  oceanBlue: {
    name: 'Ocean Blue',
    light: 'rgba(233, 231, 240, 0.9)',
    dark: 'rgba(43, 39, 54, 0.92)',
    border: 'rgba(154, 142, 176, 0.55)',
    primary: '#665B7A',
    secondary: '#7F6E91',
  },
  sunset: {
    name: 'Sunset',
    light: 'rgba(245, 226, 221, 0.9)',
    dark: 'rgba(67, 49, 47, 0.92)',
    border: 'rgba(218, 177, 168, 0.58)',
    primary: '#906158',
    secondary: '#986A79',
  },
  darkRed: {
    name: 'Dark Red',
    light: 'rgba(237, 222, 222, 0.9)',
    dark: 'rgba(61, 43, 45, 0.92)',
    border: 'rgba(179, 132, 132, 0.55)',
    primary: '#835653',
    secondary: '#714746',
  },
  darkPurple: {
    name: 'Dark Purple',
    light: 'rgba(231, 225, 234, 0.9)',
    dark: 'rgba(42, 35, 46, 0.94)',
    border: 'rgba(144, 124, 151, 0.55)',
    primary: '#694E72',
    secondary: '#594060',
  },
  dark: {
    name: 'Dark',
    light: 'rgba(233, 236, 234, 0.9)',
    dark: 'rgba(31, 38, 33, 0.94)',
    border: 'rgba(121, 139, 126, 0.5)',
    primary: '#4E6655',
    secondary: '#655A70',
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

  const blurStrength = settings.reduceTransparency ? 0 : 8;

  // Border settings
  const borderWidth = settings.addBorders ? 1 : 0;
  const borderColor = settings.increaseContrast 
    ? isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)'
    : isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)';

  // Shadow settings
  const shadowOpacity = settings.increaseContrast ? 0.12 : 0.07;
  const shadowBlur = isProminent ? 16 : 10;

  // Rank-based border highlight
  return {
    background: gradient,
    backdropFilter: `blur(${blurStrength}px)`,
    WebkitBackdropFilter: `blur(${blurStrength}px)`,
    borderRadius: 16,
    border: `${borderWidth}px solid ${borderColor}`,
    boxShadow: `0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0, 0, 0, ${shadowOpacity})`,
    transition: 'box-shadow 180ms ease, border-color 180ms ease',
    ...(rankIndex !== undefined && rankIndex < 3 && {
      borderTop: `3px solid ${rankIndex === 0 ? '#9B7545' : rankIndex === 1 ? '#7B8187' : '#936B55'}`,
    }),
    '&:hover': {
      boxShadow: `0 ${shadowBlur + 4}px ${shadowBlur * 2 + 8}px rgba(0, 0, 0, ${shadowOpacity + 0.04})`,
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
  const blurStrength = settings.reduceTransparency ? 0 : 6;

  return {
    background: gradient,
    backdropFilter: `blur(${blurStrength}px)`,
    WebkitBackdropFilter: `blur(${blurStrength}px)`,
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
