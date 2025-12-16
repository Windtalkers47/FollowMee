import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export interface Customer {
  customerId: string;
  customerName: string;
  customerLastName: string | null;
  customerEmail: string;
  customerPhone1: string | null;
  customerPhone2: string | null;
  customerFacebook: string | null;
  customerInstagram: string | null;
  customerTikTok: string | null;
  customerLine: string | null;
  customerX: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const customerService = {
  async getCustomers(): Promise<Customer[]> {
    const response = await axios.get(`${API_URL}/customers`);
    return response.data;
  },

  async getCustomer(id: string): Promise<Customer> {
    const response = await axios.get(`${API_URL}/customers/${id}`);
    return response.data;
  },

  async createCustomer(customerData: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const response = await axios.post(`${API_URL}/customers`, customerData);
    return response.data;
  },

  async updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
    const response = await axios.put(`${API_URL}/customers/${id}`, customerData);
    return response.data;
  },

  async deleteCustomer(id: string): Promise<void> {
    await axios.delete(`${API_URL}/customers/${id}`);
  },
};
