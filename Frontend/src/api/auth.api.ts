import { apiConfig, handleResponse } from './config';

interface LoginCredentials {
  email: string;
  password: string;
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
