import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { alpha, createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useLiquidGlass } from './LiquidGlassContext';
import { brandColors, layoutTokens, radii, shadows } from '../styles/designTokens';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  toggleColorMode: () => void;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => undefined,
  mode: 'light',
});

export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() =>
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  );
  const { isLiquidGlassEnabled, liquidGlassSettings } = useLiquidGlass();

  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => setMode((current) => (current === 'light' ? 'dark' : 'light')),
      mode,
    }),
    [mode]
  );

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    const primary = isDark ? brandColors.iosGreenDark : brandColors.iosGreen;
    const border = isDark ? alpha('#FFFFFF', 0.1) : alpha('#17211A', 0.08);
    const navSurface = isDark
      ? alpha('#151A18', isLiquidGlassEnabled ? 0.78 : 0.96)
      : alpha('#FFFFFF', isLiquidGlassEnabled ? 0.76 : 0.96);
    const blur = isLiquidGlassEnabled && !liquidGlassSettings.reduceTransparency
      ? `blur(${Math.min(liquidGlassSettings.blurIntensity, 28)}px) saturate(150%)`
      : 'none';

    return createTheme({
      palette: {
        mode,
        primary: {
          main: primary,
          light: '#63D77C',
          dark: brandColors.iosGreenPressed,
          contrastText: '#07120A',
        },
        secondary: {
          main: isDark ? brandColors.indigoDark : brandColors.indigo,
          contrastText: '#FFFFFF',
        },
        success: { main: primary },
        info: { main: isDark ? brandColors.blueDark : brandColors.blue },
        warning: { main: isDark ? brandColors.amberDark : brandColors.amber },
        error: { main: isDark ? brandColors.redDark : brandColors.red },
        background: {
          default: isDark ? '#0D1110' : '#F4F8F5',
          paper: isDark ? '#171C1A' : '#FFFFFF',
        },
        text: {
          primary: isDark ? '#F4F7F5' : '#17211A',
          secondary: isDark ? '#A9B4AD' : '#5F6E64',
        },
        divider: border,
      },
      shape: { borderRadius: 14 },
      typography: {
        fontFamily: [
          '"SF Pro Display"',
          '"Noto Sans Thai"',
          '"Kanit"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ].join(','),
        h1: { fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 750, lineHeight: 1.08 },
        h2: { fontSize: 'clamp(1.65rem, 4vw, 2.4rem)', fontWeight: 720, lineHeight: 1.15 },
        h3: { fontSize: 'clamp(1.35rem, 3vw, 1.85rem)', fontWeight: 700, lineHeight: 1.2 },
        h4: { fontWeight: 700, letterSpacing: '-0.025em' },
        h5: { fontWeight: 680, letterSpacing: '-0.02em' },
        h6: { fontWeight: 680 },
        button: { textTransform: 'none', fontWeight: 650, letterSpacing: 0 },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            html: { minHeight: '100%', colorScheme: mode },
            body: {
              minHeight: '100%',
              margin: 0,
              backgroundColor: isDark ? '#0D1110' : '#F4F8F5',
              backgroundImage: 'none',
              backgroundAttachment: 'fixed',
            },
            '*': { boxSizing: 'border-box' },
            '*:focus-visible': {
              outline: `3px solid ${alpha(primary, 0.34)}`,
              outlineOffset: 2,
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              color: isDark ? '#F4F7F5' : '#17211A',
              background: navSurface,
              backdropFilter: blur,
              WebkitBackdropFilter: blur,
              borderBottom: `1px solid ${border}`,
              boxShadow: 'none',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              background: navSurface,
              backdropFilter: blur,
              WebkitBackdropFilter: blur,
              borderRight: `1px solid ${border}`,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: { backgroundImage: 'none' },
            rounded: { borderRadius: radii.card },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              border: `1px solid ${border}`,
              borderRadius: radii.card,
              boxShadow: isDark
                ? shadows.cardDark
                : shadows.cardLight,
            },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: { minHeight: layoutTokens.controlHeight, borderRadius: radii.control, paddingInline: 18 },
            containedPrimary: {
              color: '#07120A',
              backgroundColor: primary,
              boxShadow: `0 8px 20px ${alpha(primary, 0.22)}`,
              '&:hover': {
                backgroundColor: isDark ? '#55D975' : '#2DBA50',
                boxShadow: `0 10px 24px ${alpha(primary, 0.3)}`,
              },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              borderRadius: radii.control,
              '&:hover': { backgroundColor: alpha(primary, 0.1) },
            },
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: {
              minHeight: 46,
              marginInline: 8,
              borderRadius: 12,
              '&.Mui-selected': {
                color: isDark ? '#D8FFE1' : '#17692D',
                backgroundColor: alpha(primary, isDark ? 0.16 : 0.13),
                '&:hover': { backgroundColor: alpha(primary, isDark ? 0.22 : 0.18) },
              },
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              border: `1px solid ${border}`,
              borderRadius: radii.modal,
              background: isDark ? '#171C1A' : '#FFFFFF',
              boxShadow: isDark
                ? shadows.floatingDark
                : shadows.floatingLight,
            },
          },
        },
        MuiTextField: {
          defaultProps: { variant: 'outlined' },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: radii.control,
              backgroundColor: isDark ? alpha('#FFFFFF', 0.035) : alpha('#17211A', 0.025),
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
                boxShadow: `0 0 0 3px ${alpha(primary, 0.12)}`,
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: { root: { borderRadius: radii.control, fontWeight: 650 } },
        },
        MuiTableCell: {
          styleOverrides: {
            head: { color: isDark ? '#C7D1CA' : '#435249', fontWeight: 700, backgroundColor: isDark ? '#1C2320' : '#F7FAF8' },
            root: { borderColor: border },
          },
        },
        MuiAlert: {
          styleOverrides: { root: { borderRadius: radii.control, boxShadow: 'none' } },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: { borderRadius: 9, fontSize: 12, padding: '7px 10px' },
          },
        },
      },
    });
  }, [isLiquidGlassEnabled, liquidGlassSettings.blurIntensity, liquidGlassSettings.reduceTransparency, mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
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
