import { Box, IconButton, SxProps, Theme } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { SearchField } from '../SearchField';
import React from 'react';

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  onRefresh?: () => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  loading?: boolean;
}

export const FilterBar = ({
  searchValue,
  onSearchChange,
  onSearch,
  onClear,
  onRefresh,
  searchPlaceholder = 'Search...',
  children,
  sx = {},
  loading = false,
}: FilterBarProps) => {
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2 },
        flexWrap: 'wrap',
        ...sx,
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        flex: 1, 
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        '& > .MuiBox-root': {
          maxWidth: { xs: '100%', sm: '500px' },
        }
      }}>
        <SearchField
          value={searchValue}
          onChange={onSearchChange}
          onSearch={onSearch}
          onClear={onClear}
          placeholder={searchPlaceholder}
          fullWidth
          loading={loading}
          maxWidth="none"
        />
        {children}
      </Box>
      {onRefresh && (
        <Box sx={{ flexShrink: 0 }}>
          <IconButton 
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh data"
            title="Refresh data"
            sx={{
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
            }}
          >
            <RefreshIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default FilterBar;
