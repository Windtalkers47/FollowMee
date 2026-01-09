import { apiConfig, handleResponse } from './config';

interface CustomerData {
  customerName: { value: string };
  customerLastName?: { value: string };
  customerEmail: { value: string };
  customerPhone1?: { value: string };
  customerPhone2?: { value: string };
  customerFacebook?: { value: string };
  customerInstagram?: { value: string };
  customerTikTok?: { value: string };
  customerLine?: { value: string };
  customerX?: { value: string };
  isActive?: boolean;
}

const transformCustomerData = (data: any): any => {
  if (!data) return data;
  
  return {
    ...data,
    customerName: { value: data.customerName || '' },
    customerLastName: data.customerLastName ? { value: data.customerLastName } : undefined,
    customerEmail: { value: data.customerEmail || '' },
    customerPhone1: data.customerPhone1 ? { value: data.customerPhone1 } : undefined,
    customerPhone2: data.customerPhone2 ? { value: data.customerPhone2 } : undefined,
    customerFacebook: data.customerFacebook ? { value: data.customerFacebook } : undefined,
    customerInstagram: data.customerInstagram ? { value: data.customerInstagram } : undefined,
    customerTikTok: data.customerTikTok ? { value: data.customerTikTok } : undefined,
    customerLine: data.customerLine ? { value: data.customerLine } : undefined,
    customerX: data.customerX ? { value: data.customerX } : undefined,
    isActive: data.isActive !== undefined ? data.isActive : true,
  };
};

export const customerApi = {
  // Get all customers with pagination
  getCustomers: async (page: number = 1, limit: number = 10, search?: string) => {
    const url = new URL(`${apiConfig.baseURL}/api/customers`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('limit', limit.toString());
    if (search) url.searchParams.append('search', search);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  // Get single customer by ID
  getCustomerById: async (customerId: string) => {
    const response = await fetch(`${apiConfig.baseURL}/api/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  // Create new customer
  createCustomer: async (customerData: Omit<CustomerData, 'customerId'>) => {
    const response = await fetch(`${apiConfig.baseURL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
      body: JSON.stringify(transformCustomerData(customerData)),
    });
    return handleResponse(response);
  },

  // Update customer
  updateCustomer: async (customerId: string, customerData: Partial<CustomerData>) => {
    const response = await fetch(`${apiConfig.baseURL}/api/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
      body: JSON.stringify(transformCustomerData(customerData)),
    });
    return handleResponse(response);
  },

  // Delete customer (soft delete)
  deleteCustomer: async (customerId: string) => {
    const response = await fetch(`${apiConfig.baseURL}/api/customers/${customerId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

export default customerApi;
