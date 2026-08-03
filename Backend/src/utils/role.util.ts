export const OWNER_ROLE = 'Owner';
export const LEGACY_OWNER_ROLE = 'Superadmin';

export const normalizeRoleName = (role: string): string =>
  role === LEGACY_OWNER_ROLE ? OWNER_ROLE : role;

export const normalizeRoles = (roles: string[] = []): string[] =>
  [...new Set(roles.map(normalizeRoleName))];

export const isOwnerRole = (role?: string | null): boolean =>
  role === OWNER_ROLE || role === LEGACY_OWNER_ROLE;

