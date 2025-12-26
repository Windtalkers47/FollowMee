// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

type ApiConfig = {
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

// Helper function to handle API responses
export const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    const error = (data && data.message) || response.statusText;
    return Promise.reject(error);
  }
  return data;
};

const config = {
  ...apiConfig,
  handleResponse,
};

export default config;
