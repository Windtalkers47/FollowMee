import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useLiquidGlass } from './LiquidGlassContext';
import { gradientPresets, GradientPresetKey } from '../styles/liquidGlassStyles';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  toggleColorMode: () => void;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => {},
  mode: 'light',
});

export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('theme') as ThemeMode) || 'light'
  );

  const { isLiquidGlassEnabled, liquidGlassSettings } = useLiquidGlass();

  // Apply theme attribute to document for SweetAlert2 styling
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode]
  );

  // Get colors based on theme preset with safe access
  const getThemeColors = useCallback(() => {
    const presetKey = liquidGlassSettings?.gradientPreset || 'classicBluePurple';
    const preset = gradientPresets[presetKey as keyof typeof gradientPresets];
    
    // Fallback to default colors if preset not found
    if (!preset) {
      return {
        primary: '#4a6cf7',
        secondary: '#a64dff',
        backgroundGradient: mode === 'light' 
          ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.25))'
          : 'linear-gradient(135deg, rgba(102, 126, 234, 0.35), rgba(118, 75, 162, 0.35))',
      };
    }
    
    return {
      primary: preset.primary || '#4a6cf7',
      secondary: preset.secondary || '#a64dff',
      backgroundGradient: mode === 'light' ? preset.light : preset.dark,
    };
  }, [liquidGlassSettings?.gradientPreset, mode]);

  // Helper function to adjust color brightness
  const adjustColorBrightness = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };

  const theme = useMemo(() => {
    if (isLiquidGlassEnabled) {
      const colors = getThemeColors();
      
      // Enhanced Liquid Glass Theme - respects current mode and theme preset
      return createTheme({
        palette: {
          mode,
          primary: {
            main: colors.primary,
            light: mode === 'light' ? adjustColorBrightness(colors.primary, 20) : adjustColorBrightness(colors.primary, -20),
            dark: mode === 'light' ? adjustColorBrightness(colors.primary, -20) : adjustColorBrightness(colors.primary, -40),
            contrastText: '#ffffff',
          },
          secondary: {
            main: colors.secondary,
            light: mode === 'light' ? adjustColorBrightness(colors.secondary, 20) : adjustColorBrightness(colors.secondary, -20),
            dark: mode === 'light' ? adjustColorBrightness(colors.secondary, -20) : adjustColorBrightness(colors.secondary, -40),
            contrastText: '#ffffff',
          },
          background: {
            default: mode === 'light' 
              ? colors.backgroundGradient
              : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            paper: mode === 'light' 
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(255, 255, 255, 0.05)',
          },
          text: {
            primary: mode === 'light' ? '#1a1a1a' : '#ffffff',
            secondary: mode === 'light' ? '#4a4a4a' : '#b3b3b3',
          },
        },
        typography: {
          fontFamily: [
            '"SF Pro Display"',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
          h1: {
            fontSize: '2.5rem',
            fontWeight: 600,
            lineHeight: 1.2,
          },
          h2: {
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.3,
          },
          h3: {
            fontSize: '1.75rem',
            fontWeight: 600,
            lineHeight: 1.4,
          },
          button: {
            textTransform: 'none',
            fontWeight: 500,
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              html: {
                height: '100%',
              },
              body: {
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundAttachment: 'fixed',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                '&::before': {
                  content: '""',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'radial-gradient(circle at 20% 80%, rgba(100, 181, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(167, 139, 250, 0.3) 0%, transparent 50%)',
                  pointerEvents: 'none',
                  zIndex: -1,
                }
              },
              ':lang(th)': {
                fontFamily: '"Kanit", sans-serif',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                background: `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.8})`,
                backdropFilter: `blur(${liquidGlassSettings.blurIntensity}px) saturate(200%)`,
                WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity}px) saturate(200%)`,
                border: liquidGlassSettings.showBorders ? `1px solid rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.3})` : 'none',
                boxShadow: `0 8px 32px 0 rgba(31, 38, 135, ${0.25 * liquidGlassSettings.glassOpacity}), inset 0 1px 0 0 rgba(255, 255, 255, ${0.2 * liquidGlassSettings.glassOpacity})`,
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                  opacity: 0.8,
                }
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                background: `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.6})`,
                backdropFilter: `blur(${liquidGlassSettings.blurIntensity * 0.8}px)`,
                WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity * 0.8}px)`,
                border: liquidGlassSettings.showBorders ? `1px solid rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.4})` : 'none',
                borderRadius: 10,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.8})`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 24px rgba(31, 38, 135, ${0.3 * liquidGlassSettings.glassOpacity})`,
                },
                '&:active': {
                  transform: 'translateY(0)',
                }
              },
              contained: {
                background: 'linear-gradient(135deg, rgba(74, 108, 247, 0.8), rgba(166, 77, 255, 0.8))',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(74, 108, 247, 0.9), rgba(166, 77, 255, 0.9))',
                }
              }
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  background: `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.6})`,
                  backdropFilter: `blur(${liquidGlassSettings.blurIntensity * 0.8}px)`,
                  WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity * 0.8}px)`,
                  border: liquidGlassSettings.showBorders ? `1px solid rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.3})` : 'none',
                  borderRadius: 10,
                  '& fieldset': {
                    borderColor: 'transparent',
                  },
                  '&:hover fieldset': {
                    borderColor: `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.4})`,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(74, 108, 247, 0.6)',
                    boxShadow: '0 0 0 3px rgba(74, 108, 247, 0.15)',
                  },
                }
              }
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                background: `rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.8})`,
                backdropFilter: `blur(${liquidGlassSettings.blurIntensity}px) saturate(200%)`,
                WebkitBackdropFilter: `blur(${liquidGlassSettings.blurIntensity}px) saturate(200%)`,
                border: liquidGlassSettings.showBorders ? `1px solid rgba(255, 255, 255, ${liquidGlassSettings.glassOpacity * 0.3})` : 'none',
                boxShadow: `0 8px 32px 0 rgba(31, 38, 135, ${0.25 * liquidGlassSettings.glassOpacity}), inset 0 1px 0 0 rgba(255, 255, 255, ${0.2 * liquidGlassSettings.glassOpacity})`,
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                  opacity: 0.8,
                },
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.02)',
                  boxShadow: `0 12px 40px 0 rgba(31, 38, 135, ${0.3 * liquidGlassSettings.glassOpacity}), inset 0 1px 0 0 rgba(255, 255, 255, ${0.3 * liquidGlassSettings.glassOpacity})`,
                }
              },
            },
          },
        },
      });
    }

    const colors = getThemeColors();

    // Regular theme
    return createTheme({
      palette: {
        mode,
        primary: {
          main: colors.primary,
          light: mode === 'light' ? adjustColorBrightness(colors.primary, 20) : adjustColorBrightness(colors.primary, -20),
          dark: mode === 'light' ? adjustColorBrightness(colors.primary, -20) : adjustColorBrightness(colors.primary, -40),
          contrastText: '#ffffff',
        },
        secondary: {
          main: colors.secondary,
          light: mode === 'light' ? adjustColorBrightness(colors.secondary, 20) : adjustColorBrightness(colors.secondary, -20),
          dark: mode === 'light' ? adjustColorBrightness(colors.secondary, -20) : adjustColorBrightness(colors.secondary, -40),
          contrastText: '#ffffff',
        },
        background: {
          default: mode === 'light' ? '#f5f7ff' : '#121212',
          paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
        },
        text: {
          primary: mode === 'light' ? '#1a1a1a' : '#ffffff',
          secondary: mode === 'light' ? '#4a4a4a' : '#b3b3b3',
        },
      },
      typography: {
        fontFamily: [
          '"SF Pro Display"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ].join(','),
        h1: { 
          fontSize: '2.5rem', 
          fontWeight: 600, 
          lineHeight: 1.2,
          color: mode === 'light' ? '#1a1a1a' : '#ffffff',
        },
        h2: { 
          fontSize: '2rem', 
          fontWeight: 600, 
          lineHeight: 1.3,
          color: mode === 'light' ? '#1a1a1a' : '#ffffff',
        },
        h3: { 
          fontSize: '1.75rem', 
          fontWeight: 600, 
          lineHeight: 1.4,
          color: mode === 'light' ? '#1a1a1a' : '#ffffff',
        },
        button: { 
          textTransform: 'none', 
          fontWeight: 500 
        },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            html: { 
              height: '100%',
              backgroundColor: mode === 'light' ? '#f5f7ff' : '#121212',
            },
            body: { 
              height: '100%',
              backgroundColor: mode === 'light' ? '#f5f7ff' : '#121212',
              color: mode === 'light' ? '#1a1a1a' : '#ffffff',
            },
            ':lang(th)': { 
              fontFamily: '"Kanit", sans-serif' 
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: mode === 'light' ? '#ffffff' : '#1e1e1e',
            },
          },
        },
      },
    });
  }, [mode, isLiquidGlassEnabled, liquidGlassSettings]);

  // Apply theme mode to body
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    document.body.style.backgroundColor = mode === 'light' ? '#f5f7ff' : '#121212';
    localStorage.setItem('theme', mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
