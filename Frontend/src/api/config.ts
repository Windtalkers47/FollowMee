import { API_URL } from '../utils/runtimeEnv';
import axios from 'axios';

// API Configuration
export const API_BASE_URL = API_URL;

export type ApiConfig = {
  baseURL: string;
  headers: Record<string, string>;
  withCredentials: boolean;
  timeout?: number;
};

// API configuration
export const apiConfig: ApiConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Application-Name': import.meta.env.VITE_APP_NAME || 'FollowMee',
  },
  withCredentials: true,
  timeout: 10000, // 10 seconds
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly requestId?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = typeof axios.create === 'function' ? axios.create(apiConfig) : axios;
apiClient.interceptors?.response?.use(response => response, error => {
  if (error?.response?.status === 401 && window.location.pathname !== '/login') window.location.assign('/login');
  return Promise.reject(error);
});

/**
 * Generic API response handler
 * ✔ Supports TypeScript generics
 * ✔ Works with ApiResponse<T>
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    return Promise.reject(new ApiError(data?.message || response.statusText, response.status, data?.code, data?.requestId));
  }

  return data as T;
}

export default {
  ...apiConfig,
  handleResponse,
};
