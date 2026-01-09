// API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

/**
 * Generic API response handler
 * ✔ Supports TypeScript generics
 * ✔ Works with ApiResponse<T>
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const error = {
      message: data?.message || response.statusText,
      status: response.status,
    };
    return Promise.reject(error);
  }

  return data as T;
}

export default {
  ...apiConfig,
  handleResponse,
};
