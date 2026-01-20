import { useThemeContext } from '../contexts/ThemeContext';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';

export const ThemeToggle = () => {
  const { toggleColorMode, mode } = useThemeContext();
  
  return (
    <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
      <IconButton
        onClick={toggleColorMode}
        color="inherit"
        aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        sx={{
          margin: '0 8px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
      </IconButton>
    </Tooltip>
  );
};
