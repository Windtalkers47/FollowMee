import { apiConfig, handleResponse } from './config';
import type { LoginResponse, ApiResponse } from '../types/api.types';
import { encryptRequestData, decryptResponseData } from '../utils/requestEncryption';

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
  register: async (credentials: RegisterCredentials): Promise<ApiResponse<{ success: boolean; data?: any }>> => {
    // Encrypt sensitive data for development
    const encryptedData = encryptRequestData(credentials);
    
    const response = await fetch(`${apiConfig.baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      body: JSON.stringify(encryptedData),
    });

    const result = handleResponse<ApiResponse<{ success: boolean; data?: any }>>(response);
    
    // Decrypt response if it was encrypted
    return decryptResponseData(result);
  },

  /**
   * Login with email & password
   */
  login: async (credentials: LoginCredentials): Promise<ApiResponse<LoginResponse['user']>> => {
    // Encrypt sensitive data for development
    const encryptedData = encryptRequestData(credentials);
    
    const response = await fetch(`${apiConfig.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      credentials: 'include',
      body: JSON.stringify(encryptedData),
    });

    const result = handleResponse<ApiResponse<LoginResponse['user']>>(response);
    
    // Decrypt response if it was encrypted
    return decryptResponseData(result);
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (
    email: string
  ): Promise<ApiResponse<ForgotPasswordResponse>> => {
    // Encrypt sensitive data for development
    const encryptedData = encryptRequestData({ email });
    
    const response = await fetch(`${apiConfig.baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      body: JSON.stringify(encryptedData),
    });

    const result = handleResponse<ApiResponse<ForgotPasswordResponse>>(response);
    
    // Decrypt response if it was encrypted
    return decryptResponseData(result);
  },

  /**
   * Reset password using token
   */
  resetPassword: async (
    data: ResetPasswordData
  ): Promise<ApiResponse<{ success: boolean }>> => {
    // Encrypt sensitive data for development
    const encryptedData = encryptRequestData(data);
    
    const response = await fetch(`${apiConfig.baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      body: JSON.stringify(encryptedData),
    });

    const result = handleResponse<ApiResponse<{ success: boolean }>>(response);
    
    // Decrypt response if it was encrypted
    return decryptResponseData(result);
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
