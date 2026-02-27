import axios from 'axios';
import { API_BASE_URL } from './config';

export interface User {
  userId: number;
  userName: string;
  userLastName: string;
  userEmail: string;
  userPhone1?: string;
  userPhone2?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fullName?: string;
}

export const userApi = {
  // Get all users
  getUsers: async (): Promise<User[]> => {
    const response = await axios.get(`${API_BASE_URL}/users`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get single user by ID
  getUserById: async (userId: number): Promise<User> => {
    const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Create new user
  createUser: async (userData: Omit<User, 'userId' | 'createdAt' | 'updatedAt'>): Promise<User> => {
    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Update user
  updateUser: async (userId: number, userData: Partial<User>): Promise<User> => {
    const response = await axios.put(`${API_BASE_URL}/users/${userId}`, userData, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Delete user
  deleteUser: async (userId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/users/${userId}`, {
      withCredentials: true,
    });
  },
};

export default userApi;
