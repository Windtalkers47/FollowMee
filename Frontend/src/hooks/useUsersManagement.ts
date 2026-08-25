import { useState, useEffect, useCallback } from 'react';
import { userApi, CreateUserPayload } from '../api/user.api';
import { API_URL } from '../utils/runtimeEnv';
import {
  toUserManagementError,
  UserManagementRequestError,
  type UserManagementErrorDescriptor,
} from '../utils/userManagementError';

export interface User {
  userId: number;
  userName: string;
  userLastName: string;
  userEmail: string;
  userPhone1?: string | null;
  userPhone2?: string | null;
  userImageUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  roles: string[];
  role?: { roleId: number; roleName: string };
  permissions: string[];
  capabilities: ManagedUserCapabilities;
}

export interface UserManagementCapabilities {
  canInviteUsers: boolean;
  canManageRoles: boolean;
  canDeactivateUsers: boolean;
  canTransferOwnership: boolean;
}

export interface ManagedUserCapabilities {
  canEditRole: boolean;
  canDeactivate: boolean;
  canReceiveTransfer: boolean;
}

export interface Role {
  roleId: number;
  roleName: string;
  description?: string;
  roleLevel: number;
  permissions: string[];
}

export interface UserWithRolesResponse extends User {
  roles: string[];
  permissions: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}


interface ManagedUserPayload extends Omit<User, 'roles' | 'capabilities'> {
  roles: Array<string | { roleId: number; roleName: string }>;
  capabilities?: ManagedUserCapabilities;
}

const noManagementCapabilities: UserManagementCapabilities = {
  canInviteUsers: false,
  canManageRoles: false,
  canDeactivateUsers: false,
  canTransferOwnership: false,
};

const noManagedUserCapabilities: ManagedUserCapabilities = {
  canEditRole: false,
  canDeactivate: false,
  canReceiveTransfer: false,
};

const normalizeManagedUser = (user: ManagedUserPayload): User => ({
  ...user,
  roles: (user.roles || []).map((role) => typeof role === 'string' ? role : role.roleName),
  capabilities: user.capabilities || noManagedUserCapabilities,
});

const API_BASE_URL = API_URL;

export const useUsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);
  const [error, setError] = useState<UserManagementErrorDescriptor | null>(null);
  const [capabilities, setCapabilities] = useState<UserManagementCapabilities>(noManagementCapabilities);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/users`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new UserManagementRequestError(response.status);
      }

      const result: ApiResponse<ManagedUserPayload[]> & { capabilities?: UserManagementCapabilities } = await response.json();

      if (result.success) {
        setUsers(result.data.map(normalizeManagedUser));
        setCapabilities(result.capabilities || noManagementCapabilities);
      } else {
        throw new UserManagementRequestError(500);
      }
    } catch (err) {
      setError(toUserManagementError(err));
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserWithRoles = async (userId: number): Promise<UserWithRolesResponse | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/users/${userId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new UserManagementRequestError(response.status);
      }

      const result: ApiResponse<ManagedUserPayload> = await response.json();

      if (result.success) {
        return normalizeManagedUser(result.data);
      } else {
        throw new UserManagementRequestError(500);
      }
    } catch (err) {
      console.error('Error fetching user with roles:', err);
      return null;
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/roles`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new UserManagementRequestError(response.status);
      }

      const result: ApiResponse<Role[]> = await response.json();

      if (result.success) {
        setRoles(result.data);
      } else {
        throw new UserManagementRequestError(500);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const assignRoleToUser = async (userId: number, roleId: number): Promise<User | null> => {
    setAssigningRole(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/users/${userId}/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, roleId }),
      });

      if (!response.ok) {
        throw new UserManagementRequestError(response.status);
      }

      const result: ApiResponse<ManagedUserPayload> = await response.json();

      if (result.success) {
        const updated = normalizeManagedUser(result.data);
        setUsers((current) => current.map((user) => user.userId === updated.userId ? updated : user));
        void fetchUsers();
        return updated;
      } else {
        throw new UserManagementRequestError(500);
      }
    } catch (err) {
      console.error('Error assigning role:', err);
      setError(toUserManagementError(err));
      return null;
    } finally {
      setAssigningRole(false);
    }
  };

  const transferOwnership = async (targetUserId: number, currentPassword: string): Promise<boolean> => {
    setAssigningRole(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/system-owner`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, currentPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new UserManagementRequestError(response.status);
      }
      await fetchUsers();
      return true;
    } catch (err) {
      setError(toUserManagementError(err));
      return false;
    } finally {
      setAssigningRole(false);
    }
  };

  const removeRoleFromUser = async (userId: number, roleId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/users/remove-role`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, roleId }),
      });

      if (!response.ok) {
        throw new UserManagementRequestError(response.status);
      }

      const result: ApiResponse<unknown> = await response.json();

      if (result.success) {
        // Refresh users list
        await fetchUsers();
        return true;
      } else {
        throw new UserManagementRequestError(500);
      }
    } catch (err) {
      console.error('Error removing role:', err);
      setError(toUserManagementError(err));
      return false;
    }
  };

  const createUser = async (payload: CreateUserPayload, roleId: number): Promise<boolean> => {
    try {
      const created = await userApi.createUser({ ...payload, isActive: true });
      const assigned = await assignRoleToUser(created.userId, roleId);
      if (!assigned) {
        throw new UserManagementRequestError(409);
      }
      await fetchUsers();
      return true;
    } catch (err) {
      console.error('Error creating user:', err);
      setError(toUserManagementError(err));
      return false;
    }
  };

  const deleteUser = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await userApi.deleteUser(userId);
      await fetchUsers(); // Refresh the users list
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(toUserManagementError(err));
      return false;
    }
  }, [fetchUsers]);

  useEffect(() => {
    // Initial async load; state changes happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUsers();
  }, [fetchUsers]);
  useEffect(() => {
    if (capabilities.canManageRoles || capabilities.canInviteUsers) {
      // Capability-gated async load; state changes happen after the request resolves.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchRoles();
    }
  }, [capabilities.canInviteUsers, capabilities.canManageRoles]);

  return {
    users,
    roles,
    loading,
    assigningRole,
    error,
    capabilities,
    fetchUsers,
    fetchUserWithRoles,
    fetchRoles,
    assignRoleToUser,
    transferOwnership,
    removeRoleFromUser,
    createUser,
    deleteUser,
  };
};
