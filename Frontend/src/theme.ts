import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light', // Enable light mode by default
    primary: {
      main: '#4a6cf7', // Blue
      light: '#7f9bff',
      dark: '#0041c3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#a64dff', // Purple
      light: '#dc7dff',
      dark: '#7200ca',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f7ff', // Light blue
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#4a4a4a',
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
    // Thai font will be handled by the CSS :lang(th) selector
    allVariants: {
      fontVariationSettings: '"opsz" 24', // Better rendering for SF Pro
    },
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
      textTransform: 'none', // Prevent uppercase buttons
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // This will be applied to the entire app
        html: {
          height: '100%',
        },
        body: {
          height: '100%',
          backgroundColor: '#f5f7ff',
        },
        // Thai language support
        ':lang(th)': {
          fontFamily: '"Kanit", sans-serif',
        },
      },
    },
  },
});
