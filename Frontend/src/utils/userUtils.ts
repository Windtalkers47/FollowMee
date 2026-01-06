import { User } from '../store/slices/authSlice';

export const getUserFullName = (user: User | null): string => {
  if (!user) return '';
  return `${user.userName} ${user.userLastName}`.trim();
};

export const isUserAdmin = (user: User | null): boolean => {
  return user?.userRole === 'admin';
};

export const isUserActive = (user: User | null): boolean => {
  return user?.isActive === true;
};

export const formatUserRole = (role?: string | null): string => {
  if (!role) return 'User';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

export const getUserInitials = (user: User | null): string => {
  if (!user) return 'U';
  const first = user.userName?.charAt(0) || '';
  const last = user.userLastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'U';
};

export const getDefaultUserAvatar = (user: User | null, size = 200): string => {
  const name = user ? `${user.userName}+${user.userLastName}` : 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=random`;
};
