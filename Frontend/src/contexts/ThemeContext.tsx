import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

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

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#4a6cf7' : '#7f9bff',
            light: mode === 'light' ? '#7f9bff' : '#a8c0ff',
            dark: mode === 'light' ? '#0041c3' : '#5d7dff',
            contrastText: '#ffffff',
          },
          secondary: {
            main: mode === 'light' ? '#a64dff' : '#c27dff',
            light: mode === 'light' ? '#dc7dff' : '#e8b3ff',
            dark: mode === 'light' ? '#7200ca' : '#8a2be2',
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
      }),
    [mode]
  );

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
