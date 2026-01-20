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
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, flex: 1, minWidth: 300, maxWidth: 500 }}>
        <SearchField
          value={searchValue}
          onChange={onSearchChange}
          onSearch={onSearch}
          onClear={onClear}
          placeholder={searchPlaceholder}
          fullWidth
          loading={loading}
        />
        {children}
      </Box>
      {onRefresh && (
        <Box>
          <IconButton 
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh data"
            title="Refresh data"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default FilterBar;