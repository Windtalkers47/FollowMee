import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Chip,
  Typography,
  Alert
} from '@mui/material';

interface RoleOption {
  value: string;
  label: string;
  description: string;
  level: number;
  color?: string;
  icon?: string;
}

interface RoleSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const roleOptions: RoleOption[] = [
  {
    value: 'Customer',
    label: 'Customer',
    description: '👤 Regular user access. Can view and manage their own profile and basic features.',
    level: 1,
    color: '#4CAF50',
    icon: '👤'
  },
  {
    value: 'Moderator',
    label: 'Moderator',
    description: '🛡️ Can view and moderate users, customers, and tasks. Perfect for content moderation and basic user management.',
    level: 50,
    color: '#FF9800',
    icon: '🛡️'
  },
  {
    value: 'Admin',
    label: 'Administrator',
    description: '⚙️ Can manage users, customers, tasks, and system settings. Cannot manage roles or permissions.',
    level: 100,
    color: '#2196F3',
    icon: '⚙️'
  },
  {
    value: 'Superadmin',
    label: 'Super Administrator',
    description: '🔥 Complete system control. Can manage everything including users, roles, permissions, and all system settings. Only one allowed.',
    level: 999,
    color: '#F44336',
    icon: '🔥'
  }
];

const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  error,
  disabled = false
}) => {
  const [superadminTaken, setSuperadminTaken] = useState(false);

  // Check if SuperAdmin is already taken (this would come from an API call)
  useEffect(() => {
    // This would be an API call to check if SuperAdmin exists
    // For now, we'll assume it's available
    // TODO: Add API endpoint to check SuperAdmin availability
    setSuperadminTaken(false);
  }, []);

  const handleChange = (event: any) => {
    onChange(event.target.value);
  };

  // Filter out SuperAdmin if it's taken
  const availableRoles = superadminTaken 
    ? roleOptions.filter(role => role.value !== 'Superadmin')
    : roleOptions;

  return (
    <Box>
      {superadminTaken && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            🔥 Super Administrator role is already taken. You can select Administrator instead.
          </Typography>
        </Alert>
      )}
      
      <FormControl fullWidth error={!!error} disabled={disabled}>
        <InputLabel id="role-selector-label">
          Choose Your Role
        </InputLabel>
        <Select
          labelId="role-selector-label"
          id="role-selector"
          value={value || ''}
          label="Choose Your Role"
          onChange={handleChange}
          renderValue={(selected) => {
            const role = roleOptions.find(r => r.value === selected);
            return role ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography mr={1}>{role.icon}</Typography>
                <Chip 
                  label={role.label} 
                  size="small" 
                  style={{ backgroundColor: role.color, color: 'white' }}
                />
              </Box>
            ) : '';
          }}
        >
          {availableRoles.map((role) => (
            <MenuItem key={role.value} value={role.value}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="h6">{role.icon}</Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color={role.color}>
                    {role.label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {role.description}
                </Typography>
                {/* <Typography variant="caption" color="textSecondary">
                  Permission Level: {role.level}
                </Typography> */}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {error && (
          <FormHelperText error>{error}</FormHelperText>
        )}
        
        <FormHelperText>
          <Typography variant="caption" color="primary">
            💡 Choose the role that best fits your needs. Higher roles have more permissions but also more responsibility.
          </Typography>
        </FormHelperText>
      </FormControl>
    </Box>
  );
};

export default RoleSelector;
