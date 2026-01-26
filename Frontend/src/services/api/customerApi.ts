import { apiConfig } from '../../api/config';
import { CustomerData, CustomerStatus } from '../../types/customer.types';

/* ============================
   Helpers
============================ */

// Convert frontend → backend
const toApiFormat = (data: Partial<CustomerData>): any => {
  const result: any = { ...data };

  const optionalFields: (keyof CustomerData)[] = [
    'customerLastName',
    'customerPhone1',
    'customerPhone2',
    'customerFacebook',
    'customerInstagram',
    'customerTikTok',
    'customerLine',
    'customerX',
  ];

  optionalFields.forEach((field) => {
    if (field in result && result[field] === '') {
      result[field] = null;
    }
  });

  delete result.isActive;

  return result;
};

// Convert backend → frontend
const fromApiFormat = (data: any): CustomerData => {
  const status: CustomerStatus =
    data?.status === 'active' || data?.status === 'inactive' || data?.status === 'canceled'
      ? data.status
      : 'active';

  return {
    customerId: data.customerId,
    customerName: data.customerName ?? '',
    customerLastName: data.customerLastName ?? null,
    customerEmail: data.customerEmail ?? '',
    status,
    isActive: status === 'active',
    customerPhone1: data.customerPhone1 ?? null,
    customerPhone2: data.customerPhone2 ?? null,
    customerFacebook: data.customerFacebook ?? null,
    customerInstagram: data.customerInstagram ?? null,
    customerTikTok: data.customerTikTok ?? null,
    customerLine: data.customerLine ?? null,
    customerX: data.customerX ?? null,
    customerAddress: data.customerAddress ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    deletedAt: data.deletedAt ?? null,
  };
};

// Central request (THROWS ON ERROR)
const apiRequest = async <T>(
  endpoint: string,
  method: string,
  data?: any
): Promise<T> => {
  const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Application-Name': apiConfig.headers['X-Application-Name'],
      ...(localStorage.getItem('token') && {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }),
    },
    credentials: 'include',
    body: data ? JSON.stringify(toApiFormat(data)) : undefined,
  });

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    /* no-op */
  }

  if (!response.ok) {
    throw new Error(json?.message || response.statusText);
  }

  return json as T;
};

/* ============================
   Types
============================ */

export interface PaginatedCustomers {
  data: CustomerData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StatusStat {
  status: 'active' | 'inactive' | 'canceled';
  count: number;
}

export interface StatusStats {
  statuses: StatusStat[];
  totalStatus: number;
}

/* ============================
   API
============================ */

export const customerApi = {
  // List customers
  async getCustomers(
    page = 1,
    limit = 10,
    search?: string,
    status?: CustomerStatus
  ): Promise<PaginatedCustomers> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(status && { status }),
    });

    const result = await apiRequest<{
      data: any[];
      meta: PaginatedCustomers['meta'];
    }>(`/customers?${params}`, 'GET');

    return {
      data: result.data.map(fromApiFormat),
      meta: result.meta,
    };
  },

  // Get by id (requires authentication)
  getCustomerById: async (customerId: string): Promise<CustomerData> => {
    const response = await apiRequest<{ data: any }>(`/customers/${customerId}`, 'GET');
    return fromApiFormat(response.data);
  },

  // Get public customer profile (no authentication required)
  getPublicCustomerProfile: async (customerId: string): Promise<CustomerData> => {
    const response = await fetch(`${apiConfig.baseURL}/customers/public/${customerId}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch customer profile');
    }
    
    const { data } = await response.json();
    return fromApiFormat(data);
  },

  // Create
  async createCustomer(
    customerData: Omit<CustomerData, 'customerId'>
  ): Promise<CustomerData> {
    const result = await apiRequest<{ data: any }>('/customers', 'POST', customerData);
    return fromApiFormat(result.data);
  },

  // Update
  async updateCustomer(
    customerId: string,
    customerData: Partial<Omit<CustomerData, 'customerId'>>
  ): Promise<CustomerData> {
    const result = await apiRequest<{ data: any }>(
      `/customers/${customerId}`,
      'PUT',
      customerData
    );
    return fromApiFormat(result.data);
  },

  // Delete
  async deleteCustomer(customerId: string): Promise<void> {
    await apiRequest<void>(`/customers/${customerId}`, 'DELETE');
  },

  // Status stats
  async getStatusStats(): Promise<StatusStats> {
    const result = await apiRequest<{ data: StatusStats }>(
      '/customers/status-stats',
      'GET'
    );
    return result.data;
  },
};

export default customerApi;
