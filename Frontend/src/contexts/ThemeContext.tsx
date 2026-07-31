import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { alpha, createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useLiquidGlass } from './LiquidGlassContext';
import { brandColors, brandThemeTokens, layoutTokens, radii, shadows } from '../styles/designTokens';
import { useUserPreferences } from './UserPreferencesContext';
import type { BrandTheme, ColorModePreference } from '../services/userPreferences.api';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  toggleColorMode: () => void;
  mode: ThemeMode;
  colorMode: ColorModePreference;
  brandTheme: BrandTheme;
  setColorMode: (mode: ColorModePreference) => Promise<void>;
  setBrandTheme: (theme: BrandTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => undefined,
  mode: 'light',
  colorMode: 'system',
  brandTheme: 'purple',
  setColorMode: async () => undefined,
  setBrandTheme: async () => undefined,
});

export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }: { children: ReactNode }) => {
  const {
    resolvedMode: mode,
    colorMode: colorModePreference,
    brandTheme,
    setColorMode,
    setBrandTheme,
  } = useUserPreferences();
  const { isLiquidGlassEnabled, liquidGlassSettings } = useLiquidGlass();

  const themeControls = useMemo(
    () => ({
      toggleColorMode: () => void setColorMode(mode === 'light' ? 'dark' : 'light'),
      mode,
      colorMode: colorModePreference,
      brandTheme,
      setColorMode,
      setBrandTheme,
    }),
    [brandTheme, colorModePreference, mode, setBrandTheme, setColorMode]
  );

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    const semantic = brandThemeTokens[brandTheme][isDark ? 'dark' : 'light'];
    const primary = semantic.action;
    const primaryPressed = semantic.actionPressed;
    const border = semantic.border;
    const navSurface = isDark
      ? alpha(semantic.panel, isLiquidGlassEnabled ? 0.82 : 0.98)
      : alpha(semantic.panel, isLiquidGlassEnabled ? 0.8 : 0.98);
    const blur = isLiquidGlassEnabled && !liquidGlassSettings.reduceTransparency
      ? `blur(${Math.min(liquidGlassSettings.blurIntensity, 28)}px) saturate(150%)`
      : 'none';

    return createTheme({
      palette: {
        mode,
        primary: {
          main: primary,
          light: semantic.accent,
          dark: primaryPressed,
          contrastText: isDark ? semantic.page : '#FFFFFF',
        },
        secondary: {
          main: semantic.accent,
          light: semantic.secondary,
          dark: primaryPressed,
          contrastText: isDark ? semantic.page : semantic.text,
        },
        success: { main: brandTheme === 'green' ? primary : '#4F7A5A' },
        info: { main: isDark ? brandColors.blueDark : brandColors.blue },
        warning: { main: isDark ? brandColors.amberDark : brandColors.amber },
        error: { main: isDark ? brandColors.redDark : brandColors.red },
        background: {
          default: semantic.page,
          paper: semantic.panel,
        },
        text: {
          primary: semantic.text,
          secondary: semantic.secondaryText,
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
              backgroundColor: semantic.page,
              backgroundImage: 'none',
              backgroundAttachment: 'fixed',
            },
            '*': { boxSizing: 'border-box' },
            '*:focus-visible': {
              outline: `3px solid ${alpha(semantic.focusRing, 0.42)}`,
              outlineOffset: 2,
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              color: semantic.text,
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
              color: isDark ? semantic.page : '#FFFFFF',
              backgroundColor: primary,
              boxShadow: `0 8px 20px ${alpha(primary, 0.22)}`,
              '&:hover': {
                backgroundColor: primaryPressed,
                boxShadow: `0 10px 24px ${alpha(primary, 0.3)}`,
              },
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              minWidth: 44,
              minHeight: 44,
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
                color: isDark ? '#FFFFFF' : primaryPressed,
                backgroundColor: semantic.active,
                '&:hover': { backgroundColor: alpha(semantic.accent, isDark ? 0.3 : 0.38) },
              },
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              minHeight: 44,
              '&.Mui-selected': {
                color: isDark ? '#FFFFFF' : primaryPressed,
                fontWeight: 700,
              },
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              border: `1px solid ${border}`,
              borderRadius: radii.modal,
              background: semantic.panel,
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
              backgroundColor: isDark ? alpha('#FFFFFF', 0.035) : semantic.muted,
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
            head: { color: semantic.secondaryText, fontWeight: 700, backgroundColor: semantic.muted },
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
  }, [brandTheme, isLiquidGlassEnabled, liquidGlassSettings.blurIntensity, liquidGlassSettings.reduceTransparency, mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-brand-theme', brandTheme);
  }, [brandTheme, mode]);

  return (
    <ThemeContext.Provider value={themeControls}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
