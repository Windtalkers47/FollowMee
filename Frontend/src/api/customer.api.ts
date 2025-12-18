import { apiConfig, handleResponse } from './config';

interface CustomerData {
  customerName: string;
  customerLastName?: string;
  customerEmail: string;
  customerPhone1?: string;
  customerPhone2?: string;
  customerFacebook?: string;
  customerInstagram?: string;
  customerTikTok?: string;
  customerLine?: string;
  customerX?: string;
  isActive?: boolean;
}

export const customerApi = {
  // Get all customers
  getCustomers: async () => {
    const response = await fetch(`${apiConfig.baseURL}/customers`, {
      method: 'GET',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return handleResponse(response);
  },

  // Get single customer by ID
  getCustomerById: async (customerId: number) => {
    const response = await fetch(`${apiConfig.baseURL}/customers/${customerId}`, {
      method: 'GET',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return handleResponse(response);
  },

  // Create new customer
  createCustomer: async (customerData: CustomerData) => {
    const response = await fetch(`${apiConfig.baseURL}/customers`, {
      method: 'POST',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(customerData),
    });
    return handleResponse(response);
  },

  // Update customer
  updateCustomer: async (customerId: number, customerData: Partial<CustomerData>) => {
    const response = await fetch(`${apiConfig.baseURL}/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(customerData),
    });
    return handleResponse(response);
  },

  // Delete customer
  deleteCustomer: async (customerId: number) => {
    const response = await fetch(`${apiConfig.baseURL}/customers/${customerId}`, {
      method: 'DELETE',
      headers: {
        ...apiConfig.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return handleResponse(response);
  },
};

export default customerApi;
