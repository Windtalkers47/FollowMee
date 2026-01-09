// Base API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiConfig = {
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Handles API response and error handling
 * @param response - The fetch response object
 * @returns A promise that resolves to the parsed JSON response
 */
export const handleResponse = async <T>(response: Response): Promise<{
  success: boolean;
  data?: T;
  message?: string;
  meta?: any;
}> => {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const error = data?.message || response.statusText || 'An error occurred';
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    
    // Handle specific status codes
    if (response.status === 401) {
      // Handle unauthorized (e.g., redirect to login)
      console.warn('User is not authenticated. Redirecting to login...');
      // You can add redirect logic here if needed
    } else if (response.status === 403) {
      // Handle forbidden
      console.warn('User does not have permission to perform this action');
    } else if (response.status === 404) {
      // Handle not found
      console.warn('The requested resource was not found');
    } else if (response.status >= 500) {
      // Handle server errors
      console.error('Server error occurred');
    }
    
    return {
      success: false,
      message: error,
    };
  }
  
  // Handle successful response
  return {
    success: true,
    data: data.data,
    message: data.message,
    meta: data.meta,
  };
};

/**
 * Helper to create query string from object
 */
export const createQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v.toString()));
      } else {
        searchParams.append(key, value.toString());
      }
    }
  });
  
  return searchParams.toString();
};

export default {
  apiConfig,
  handleResponse,
  createQueryString,
};
