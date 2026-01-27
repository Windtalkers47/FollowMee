import { useThemeContext } from '../contexts/ThemeContext';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';

export const ThemeToggle = () => {
  const { toggleColorMode, mode } = useThemeContext();
  const theme = useTheme();
  
  return (
    <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <IconButton
        onClick={toggleColorMode}
        aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        sx={{
          ml: 1,
          bgcolor: 'transparent',
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          '&:hover': {
            bgcolor: theme.palette.action.hover,
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
          width: 36,
          height: 36,
        }}
      >
        {mode === 'light' ? (
          <Brightness4 fontSize="small" />
        ) : (
          <Brightness7 
            fontSize="small" 
            sx={{
              color: theme.palette.warning.light
            }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
};
