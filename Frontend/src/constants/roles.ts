// Standardized role names used throughout the application
export const ROLE_NAMES = {
  OWNER: 'Owner',
  ADMIN: 'Admin', 
  MODERATOR: 'Moderator',
  MEMBER: 'Member'
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

// Helper function to normalize role names
export const normalizeRoleName = (role: string): RoleName => {
  const normalized = role.toLowerCase().trim();
  
  switch (normalized) {
    case 'superadmin':
    case 'super_admin':
    case 'super-admin':
    case 'owner':
      return ROLE_NAMES.OWNER;
    case 'admin':
      return ROLE_NAMES.ADMIN;
    case 'moderator':
      return ROLE_NAMES.MODERATOR;
    case 'customer':
    case 'member':
      return ROLE_NAMES.MEMBER;
    default:
      // Return the original if no match found
      return role as RoleName;
  }
};
