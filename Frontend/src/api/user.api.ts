import { apiConfig, handleResponse } from './config';

interface UserData {
  userName: string;
  userLastName: string;
  userEmail: string;
  userPassword: string;
  userPhone1?: string;
  userPhone2?: string;
  isActive?: boolean;
}

export const userApi = {
  // Get all users
  getUsers: async () => {
    const response = await fetch(`${apiConfig.baseURL}/users`, {
      method: 'GET',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return handleResponse(response);
  },

  // Get single user by ID
  getUserById: async (userId: number) => {
    const response = await fetch(`${apiConfig.baseURL}/users/${userId}`, {
      method: 'GET',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return handleResponse(response);
  },

  // Create new user
  createUser: async (userData: UserData) => {
    const response = await fetch(`${apiConfig.baseURL}/users`, {
      method: 'POST',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // Update user
  updateUser: async (userId: number, userData: Partial<UserData>) => {
    const response = await fetch(`${apiConfig.baseURL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // Delete user
  deleteUser: async (userId: number) => {
    const response = await fetch(`${apiConfig.baseURL}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return handleResponse(response);
  },
};

export default userApi;
