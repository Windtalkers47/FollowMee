import { apiConfig, handleResponse } from './config';

interface LoginCredentials {
  email: string;
  password: string;
}

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await fetch(`${apiConfig.baseURL}/auth/login`, {
      method: 'POST',
      headers: apiConfig.headers,
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  // Password reset functionality
  forgotPassword: async (email: string) => {
    const response = await fetch(`${apiConfig.baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: apiConfig.headers,
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  resetPassword: async (data: ResetPasswordData) => {
    const response = await fetch(`${apiConfig.baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: apiConfig.headers,
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getCurrentUser: async () => {
    const response = await fetch(`${apiConfig.baseURL}/auth/me`, {
      method: 'GET',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return handleResponse(response);
  },

  logout: () => {
    localStorage.removeItem('token');
    // Redirect to login or home page
    window.location.href = '/login';
  },

  getAuthHeader: () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },
};

export default authApi;
