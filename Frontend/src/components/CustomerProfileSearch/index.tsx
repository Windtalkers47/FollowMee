import React from 'react';
import { SearchField } from '../SearchField';
import { Box, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface CustomerProfileSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  onClear?: () => void;
  onRefresh?: () => void;
  placeholder?: string;
  fullWidth?: boolean;
  loading?: boolean;
  sx?: object;
}

export const CustomerProfileSearch: React.FC<CustomerProfileSearchProps> = ({
  value,
  onChange,
  onSearch,
  onClear,
  onRefresh,
  placeholder = 'Search customers by name, email, or phone...',
  fullWidth = true,
  loading = false,
  sx = {},
}) => {
  const { t } = useUserPreferences();
  return (
    <Box sx={{ mb: 3, ...sx }}>
      <Box display="flex" gap={1} alignItems="center">
        <Box flex={1}>
          <SearchField
            value={value}
            onChange={onChange}
            onSearch={onSearch}
            onClear={onClear}
            placeholder={placeholder}
            fullWidth={fullWidth}
            loading={loading}
            maxWidth="100%"
          />
        </Box>
        {onRefresh && (
          <IconButton 
            onClick={onRefresh} 
            disabled={loading}
            aria-label={t('common.refresh')}
            title={t('common.refresh')}
          >
            <RefreshIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default CustomerProfileSearch;
