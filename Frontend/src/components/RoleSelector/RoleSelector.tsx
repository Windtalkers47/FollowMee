import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Chip,
  Typography,
  Alert,
  useTheme
} from '@mui/material';
import {
  AdminPanelSettingsOutlined,
  InfoOutlined,
  PersonOutline,
  ShieldOutlined,
  WorkspacePremiumOutlined,
} from '@mui/icons-material';
import { brandColors } from '../../styles/designTokens';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface RoleOption {
  value: string;
  label: string;
  description: string;
  level: number;
  color: string;
  icon: ReactNode;
}

interface RoleSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  roleCounts?: {
    Customer: number;
    Moderator: number;
    Admin: number;
    Owner: number;
  };
  showCounts?: boolean;
  currentUserRole?: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'Customer',
    label: 'Customer',
    description: 'Regular user access. Can view and manage their own profile and basic features.',
    level: 1,
    color: brandColors.iosGreen,
    icon: <PersonOutline fontSize="small" />
  },
  {
    value: 'Moderator',
    label: 'Moderator',
    description: 'Can view and moderate users, customers, and tasks. Perfect for content moderation and basic user management.',
    level: 50,
    color: brandColors.amber,
    icon: <ShieldOutlined fontSize="small" />
  },
  {
    value: 'Admin',
    label: 'Administrator',
    description: 'Can manage users, customers, tasks, and system settings. Cannot manage roles or permissions.',
    level: 100,
    color: brandColors.blue,
    icon: <AdminPanelSettingsOutlined fontSize="small" />
  },
  {
    value: 'Owner',
    label: 'Owner',
    description: 'The organization Owner is changed only through the secure ownership transfer flow.',
    level: 999,
    color: brandColors.red,
    icon: <WorkspacePremiumOutlined fontSize="small" />
  }
];

const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  roleCounts = { Customer: 0, Moderator: 0, Admin: 0, Owner: 0 },
  showCounts = false,
  currentUserRole = ''
}) => {
  const theme = useTheme();
  const { t } = useUserPreferences();
  const [ownerTaken, setOwnerTaken] = useState(false);
  const roleCopy = (role: RoleOption) => {
    const key = role.value.toLowerCase();
    return {
      label: t(`role.${key}` as Parameters<typeof t>[0]),
      description: t(`role.${key}Description` as Parameters<typeof t>[0]),
    };
  };

  useEffect(() => {
    setOwnerTaken(roleCounts.Owner >= 1 && currentUserRole !== 'Owner');
  }, [roleCounts.Owner, currentUserRole]);

  const handleChange = (event: any) => {
    onChange(event.target.value);
  };

  // Owner is deliberately never assignable from the generic role selector.
  const availableRoles = roleOptions.filter(role => role.value !== 'Owner');

  return (
    <Box>
      {ownerTaken && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {t('users.ownerTransferRequired')}
          </Typography>
        </Alert>
      )}
      
      <FormControl fullWidth error={!!error} disabled={disabled}>
        <InputLabel id="role-selector-label">
          {t('role.choose')}
        </InputLabel>
        <Select
          labelId="role-selector-label"
          id="role-selector"
          value={value || ''}
          label={t('role.choose')}
          onChange={handleChange}
          renderValue={(selected) => {
            const role = roleOptions.find(r => r.value === selected);
            const copy = role ? roleCopy(role) : undefined;
            return role && copy ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography mr={1}>{role.icon}</Typography>
                <Chip 
                  label={copy.label}
                  size="small" 
                  style={{ backgroundColor: role.color, color: 'white' }}
                />
              </Box>
            ) : '';
          }}
        >
          {availableRoles.map((role) => {
            const copy = roleCopy(role);
            const count = roleCounts[role.value as keyof typeof roleCounts] || 0;
            const isOwner = role.value === 'Owner';
            const isDisabled = isOwner;
            
            return (
              <MenuItem 
                key={role.value} 
                value={role.value}
                disabled={isDisabled}
              >
                <Box display="flex" alignItems="center" gap={1} justifyContent="space-between" width="100%">
                  <Box display="flex" alignItems="center" gap={1} flex={1}>
                    <Typography variant="h6">{role.icon}</Typography>
                    <Box flex={1}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                        color: role.color,
                        textShadow: theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                      }}>
                        {copy.label}
                        {isDisabled && (
                          <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1, fontWeight: 600 }}>
                            ({t('role.assigned')})
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
                        {copy.description}
                      </Typography>
                    </Box>
                  </Box>
                  {showCounts && (
                    <Chip 
                      label={isOwner ? `${count}/1` : count}
                      size="small" 
                      color={isOwner ? (ownerTaken ? "error" : "success") : "primary"}
                      variant="outlined"
                    />
                  )}
                </Box>
              </MenuItem>
            );
          })}
        </Select>
        {error && (
          <FormHelperText error>{error}</FormHelperText>
        )}
        
        <FormHelperText>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <InfoOutlined sx={{ fontSize: 16 }} aria-hidden="true" />
            {t('role.chooseHelp')}
          </Typography>
        </FormHelperText>
      </FormControl>
    </Box>
  );
};

export default RoleSelector;
