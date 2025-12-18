const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API configuration
export const apiConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
