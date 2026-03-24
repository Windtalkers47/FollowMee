// Standardized role names used throughout the application
export const ROLE_NAMES = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Admin', 
  MODERATOR: 'Moderator',
  CUSTOMER: 'Customer'
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

// Helper function to normalize role names
export const normalizeRoleName = (role: string): RoleName => {
  const normalized = role.toLowerCase().trim();
  
  switch (normalized) {
    case 'superadmin':
    case 'super_admin':
    case 'super-admin':
      return ROLE_NAMES.SUPERADMIN;
    case 'admin':
      return ROLE_NAMES.ADMIN;
    case 'moderator':
      return ROLE_NAMES.MODERATOR;
    case 'customer':
      return ROLE_NAMES.CUSTOMER;
    default:
      // Return the original if no match found
      return role as RoleName;
  }
};
