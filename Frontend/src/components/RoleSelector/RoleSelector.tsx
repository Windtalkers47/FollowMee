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
    Superadmin: number;
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
    value: 'Superadmin',
    label: 'Super Administrator',
    description: 'Complete system control. Can manage everything including users, roles, permissions, and all system settings. Only one allowed.',
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
  roleCounts = { Customer: 0, Moderator: 0, Admin: 0, Superadmin: 0 },
  showCounts = false,
  currentUserRole = ''
}) => {
  const theme = useTheme();
  const [superadminTaken, setSuperadminTaken] = useState(false);

  // Check if SuperAdmin is already taken
  useEffect(() => {
    const isTaken = roleCounts.Superadmin >= 1 && currentUserRole !== 'Superadmin';
    setSuperadminTaken(isTaken);
  }, [roleCounts.Superadmin, currentUserRole]);

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
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Super Administrator role is already assigned to {roleCounts.Superadmin} user(s). 
            Only one Super Admin is allowed in the system. You're may choose Admin instead.
            {currentUserRole === 'Superadmin' && ' You can keep your current role or choose a different one.'}
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
          {availableRoles.map((role) => {
            const count = roleCounts[role.value as keyof typeof roleCounts] || 0;
            const isSuperAdmin = role.value === 'Superadmin';
            const isDisabled = isSuperAdmin && superadminTaken && currentUserRole !== 'Superadmin';
            
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
                        {role.label}
                        {isDisabled && (
                          <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1, fontWeight: 600 }}>
                            (Already assigned)
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
                        {role.description}
                      </Typography>
                    </Box>
                  </Box>
                  {showCounts && (
                    <Chip 
                      label={isSuperAdmin ? `${count}/1` : count} 
                      size="small" 
                      color={isSuperAdmin ? (superadminTaken ? "error" : "success") : "primary"}
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
            Choose the role that best fits the user's responsibilities.
          </Typography>
        </FormHelperText>
      </FormControl>
    </Box>
  );
};

export default RoleSelector;
