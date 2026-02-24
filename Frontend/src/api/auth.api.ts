import { apiConfig, handleResponse } from './config';
import type { LoginResponse, ApiResponse } from '../types/api.types';

// --------------------
// Types
// --------------------
export interface RegisterCredentials {
  email: string;
  userName: string;
  userLastName: string;
  userPassword: string;
  userPhone1?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;  // Made required to match authSlice type
}


interface ResetPasswordData {
  token: string;
  newPassword: string;
}

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

// --------------------
// API
// --------------------
const authApi = {
  /**
   * Login with email & password
   */
  /**
   * Register a new user
   */
  register: async (credentials: RegisterCredentials): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await fetch(`${apiConfig.baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      body: JSON.stringify(credentials),
    });

    return handleResponse<{ success: boolean }>(response);
  },

  /**
   * Login with email & password
   */
  login: async (credentials: LoginCredentials): Promise<ApiResponse<LoginResponse['user']>> => {
    const response = await fetch(`${apiConfig.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    return handleResponse<ApiResponse<LoginResponse['user']>>(response);
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (
    email: string
  ): Promise<ApiResponse<ForgotPasswordResponse>> => {
    const response = await fetch(`${apiConfig.baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      body: JSON.stringify({ email }),
    });

    return handleResponse<ApiResponse<ForgotPasswordResponse>>(response);
  },

  /**
   * Reset password using token
   */
  resetPassword: async (
    data: ResetPasswordData
  ): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await fetch(`${apiConfig.baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      body: JSON.stringify(data),
    });

    return handleResponse<ApiResponse<{ success: boolean }>>(response);
  },

  /**
   * Get currently authenticated user
   */
  getCurrentUser: async (): Promise<ApiResponse<LoginResponse['user']>> => {
    const response = await fetch(`${apiConfig.baseURL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      credentials: 'include', // Important: include cookies in the request
    });

    return handleResponse<ApiResponse<LoginResponse['user']>>(response);
  },

  /**
   * Logout user
   */
  logout: async (): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await fetch(`${apiConfig.baseURL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      credentials: 'include', // Important: include cookies in the request
    });

    // Clear any remaining tokens from storage (for backward compatibility)
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');

    return handleResponse<ApiResponse<{ success: boolean }>>(response);
  },

  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<{
    accessToken: string;
    refreshToken: string;
  }> => {
    const response = await fetch(`${apiConfig.baseURL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    return handleResponse<{
      accessToken: string;
      refreshToken: string;
    }>(response);
  },

  /**
   * Helper: get Authorization header
   * With HTTP-only cookies, we don't need to manually include the token in headers
   * The browser will automatically include the cookie with each request
   */
  getAuthHeader: (): { [key: string]: string } => {
    // Return empty headers since we're using HTTP-only cookies
    return {};
  },
};

export default authApi;
