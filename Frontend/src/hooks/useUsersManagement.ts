import { useState, useEffect, useCallback } from 'react';
import { userApi, CreateUserPayload } from '../api/user.api';

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
  permissions: string[];
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useUsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/users`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const result: ApiResponse<User[]> = await response.json();

      if (result.success) {
        setUsers(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch users');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserWithRoles = async (userId: number): Promise<UserWithRolesResponse | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/users/${userId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const result: ApiResponse<UserWithRolesResponse> = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch user');
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
        throw new Error(`Failed to fetch roles: ${response.statusText}`);
      }

      const result: ApiResponse<Role[]> = await response.json();

      if (result.success) {
        setRoles(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch roles');
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const assignRoleToUser = async (userId: number, roleId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-management/users/assign-role`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, roleId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign role: ${response.statusText}`);
      }

      const result: ApiResponse<any> = await response.json();

      if (result.success) {
        // Refresh users list
        await fetchUsers();
        return true;
      } else {
        throw new Error(result.message || 'Failed to assign role');
      }
    } catch (err) {
      console.error('Error assigning role:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return false;
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
        throw new Error(`Failed to remove role: ${response.statusText}`);
      }

      const result: ApiResponse<any> = await response.json();

      if (result.success) {
        // Refresh users list
        await fetchUsers();
        return true;
      } else {
        throw new Error(result.message || 'Failed to remove role');
      }
    } catch (err) {
      console.error('Error removing role:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return false;
    }
  };

  const createUser = async (payload: CreateUserPayload, roleId: number): Promise<boolean> => {
    try {
      const created = await userApi.createUser({ ...payload, isActive: true });
      const assigned = await assignRoleToUser(created.userId, roleId);
      if (!assigned) {
        throw new Error('User was created, but the selected role could not be assigned');
      }
      await fetchUsers();
      return true;
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
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
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return false;
    }
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  return {
    users,
    roles,
    loading,
    error,
    fetchUsers,
    fetchUserWithRoles,
    fetchRoles,
    assignRoleToUser,
    removeRoleFromUser,
    createUser,
    deleteUser,
  };
};
