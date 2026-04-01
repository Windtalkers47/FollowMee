import { AuthUser } from '../store/slices/authSlice';

export const getUserFullName = (user: AuthUser | null): string => {
  if (!user) return '';
  return `${user.userName} ${user.userLastName || ''}`.trim();
};

export const isUserAdmin = (user: AuthUser | null): boolean => {
  return user?.roles?.includes('admin') || false;
};

export const isUserActive = (user: AuthUser | null): boolean => {
  return user !== null; // AuthUser is considered active if it exists
};

export const formatUserRole = (roles?: string[] | null): string => {
  if (!roles || roles.length === 0) return 'User';
  // Return the first role, formatted properly
  const role = roles[0];
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

export const getUserInitials = (user: AuthUser | null): string => {
  if (!user) return 'U';
  const first = user.userName?.charAt(0) || '';
  const last = user.userLastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'U';
};

export const getDefaultUserAvatar = (user: AuthUser | null, size = 200): string => {
  const name = user ? `${user.userName}+${user.userLastName || ''}` : 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=random`;
};
