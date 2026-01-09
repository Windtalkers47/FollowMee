import { apiConfig } from '../../api/config';
import { CustomerData } from '../../types/customer.types';

// API Response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Transform customer data to match backend format
const toApiFormat = (data: Partial<CustomerData>): any => {
  const result: any = { ...data };
  
  // Convert empty strings to null for optional fields
  const optionalFields: (keyof CustomerData)[] = [
    'customerLastName',
    'customerPhone1',
    'customerPhone2',
    'customerFacebook',
    'customerInstagram',
    'customerTikTok',
    'customerLine',
    'customerX'
  ];

  optionalFields.forEach(field => {
    if (field in result && result[field] === '') {
      result[field] = null;
    }
  });

  return result;
};

// Transform API response to frontend format
const fromApiFormat = (data: any): CustomerData => {
  if (!data) return data;
  
  return {
    customerId: data.customerId,
    customerName: data.customerName || '',
    customerLastName: data.customerLastName || null,
    customerEmail: data.customerEmail || '',
    customerPhone1: data.customerPhone1 || null,
    customerPhone2: data.customerPhone2 || null,
    customerFacebook: data.customerFacebook || null,
    customerInstagram: data.customerInstagram || null,
    customerTikTok: data.customerTikTok || null,
    customerLine: data.customerLine || null,
    customerX: data.customerX || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    deletedAt: data.deletedAt || null,
  };
};

// Helper to handle API requests
const apiRequest = async <T>(
  endpoint: string, 
  method: string, 
  data?: any
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Application-Name': apiConfig.headers['X-Application-Name'],
        ...(localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      credentials: 'include',
      body: data ? JSON.stringify(toApiFormat(data)) : undefined,
    });

    // Handle 204 No Content responses
    if (response.status === 204) {
      return { success: true } as ApiResponse<T>;
    }

    const result = await response.json().catch(() => ({
      success: false,
      message: 'Failed to parse JSON response'
    }));

    // If the response is not ok, throw an error
    if (!response.ok) {
      throw new Error(
        result.message || 
        `Request failed with status ${response.status}: ${response.statusText}`
      );
    }
    
    // If the response is already in our expected format, return it
    if (result && typeof result === 'object' && 'success' in result) {
      // Transform data if it exists
      if ('data' in result) {
        if (Array.isArray(result.data)) {
          return {
            ...result,
            data: result.data.map((item: any) => fromApiFormat(item))
          } as ApiResponse<T>;
        } else if (result.data && typeof result.data === 'object') {
          return {
            ...result,
            data: fromApiFormat(result.data)
          } as ApiResponse<T>;
        }
      }
      return result as ApiResponse<T>;
    }
    
    // If the response is just the data, wrap it in our standard response format
    return {
      success: true,
      data: Array.isArray(result) 
        ? result.map((item: any) => fromApiFormat(item))
        : fromApiFormat(result)
    } as ApiResponse<T>;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};

export const customerApi = {
  // Get all customers with pagination
  getCustomers: async (
    page: number = 1, 
    limit: number = 10, 
    search?: string,
    status?: 'active' | 'inactive'
  ): Promise<ApiResponse<CustomerData[]>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(status && { status })
    });
    
    const response = await apiRequest<CustomerData | CustomerData[]>(`/customers?${params}`, 'GET');
    
    // Handle case where data is a single customer object instead of an array
    if (response.data && !Array.isArray(response.data)) {
      return {
        ...response,
        data: [response.data as CustomerData],
        meta: {
          total: 1,
          page: page,
          limit: limit,
          totalPages: 1,
          ...response.meta
        }
      } as ApiResponse<CustomerData[]>;
    }
    
    return response as ApiResponse<CustomerData[]>;
  },

  // Get single customer by ID
  getCustomerById: async (customerId: string): Promise<ApiResponse<CustomerData>> => {
    return apiRequest<CustomerData>(`/customers/${customerId}`, 'GET');
  },

  // Create new customer
  createCustomer: async (customerData: Omit<CustomerData, 'customerId'>): Promise<ApiResponse<CustomerData>> => {
    return apiRequest<CustomerData>('/customers', 'POST', customerData);
  },

  // Update customer
  updateCustomer: async (
    customerId: string, 
    customerData: Partial<Omit<CustomerData, 'customerId'>>
  ): Promise<ApiResponse<CustomerData>> => {
    return apiRequest<CustomerData>(`/customers/${customerId}`, 'PUT', customerData);
  },

  // Delete customer (soft delete)
  deleteCustomer: async (customerId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/customers/${customerId}`, 'DELETE');
  },
};

export default customerApi;
