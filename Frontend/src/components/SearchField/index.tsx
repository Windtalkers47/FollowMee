import React, { useState, useRef, KeyboardEvent } from 'react';
import { InputAdornment, TextField, IconButton, TextFieldProps, Box, Button, Fade } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

interface SearchFieldProps extends Omit<TextFieldProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  fullWidth?: boolean;
  maxWidth?: number | string;
  loading?: boolean;
}

export const SearchField = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Search...',
  fullWidth = true,
  maxWidth = 400,
  loading = false,
  ...props
}: SearchFieldProps) => {
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync controlled value
  React.useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange?.(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(inputValue.trim());
    }
  };

  const handleSearchClick = () => {
    onSearch?.(inputValue.trim());
    if (inputRef.current) inputRef.current.blur();
  };

  const handleClear = () => {
    setInputValue('');
    onChange?.('');
    onClear?.();
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <Box display="flex" alignItems="center" sx={{ width: fullWidth ? '100%' : 'auto', maxWidth }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <Fade in={!!inputValue} unmountOnExit>
              <InputAdornment position="end">
                <IconButton
                  aria-label="Clear search"
                  onClick={handleClear}
                  edge="end"
                  size="small"
                  sx={{ opacity: 0.7 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            </Fade>
          ),
          sx: {
            borderRadius: 999,
            bgcolor: 'background.paper',
            boxShadow: '0 2px 16px 0 rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.2s, border-color 0.2s',
            maxWidth: maxWidth,
            '&:focus-within': {
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
              borderColor: 'primary.main',
            },
          },
        }}
        inputProps={{
          'aria-label': 'search',
          style: { fontSize: 16, padding: '10px 0' },
        }}
        {...props}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleSearchClick}
        disabled={loading || !inputValue.trim()}
        sx={{
          ml: 2,
          borderRadius: 999,
          minWidth: 48,
          minHeight: 48,
          boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: 16,
          px: 3,
          py: 1.3,
          transition: 'background 0.2s',
          '&:hover': {
            background: 'linear-gradient(90deg, #1976d2 60%, #42a5f5 100%)',
          },
        }}
        aria-label="Search"
        tabIndex={0}
      >
        Search
      </Button>
    </Box>
  );
};

export default SearchField;
