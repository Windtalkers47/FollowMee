import { apiConfig } from '../../lib/api/client';
import { CustomerData, CustomerStatus } from '../../types/customer.types';
import { getAccessToken } from '../../utils/auth';

/* ============================
   Helpers
============================ */

// Convert frontend → backend
type RequestPayload = Record<string, unknown>;
type ApiCustomer = Partial<CustomerData>;

export type CustomerRequestFailureKind = 'aborted' | 'transient' | 'http';

export class CustomerRequestError extends Error {
  constructor(
    message: string,
    readonly kind: CustomerRequestFailureKind,
    readonly status?: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'CustomerRequestError';
  }
}

const toApiFormat = (data: RequestPayload): RequestPayload => {
  const result: RequestPayload = { ...data };

  const optionalFields = [
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

  // Preserve base64Image if it exists
  if ('base64Image' in data) {
    result.base64Image = data.base64Image;
  }

  delete result.isActive;
  delete result.customerImageFile; // Remove the File object before sending

  return result;
};

// Convert backend → frontend
const fromApiFormat = (data: ApiCustomer): CustomerData => {
  const status: CustomerStatus =
    data?.status === 'active' || data?.status === 'inactive' || data?.status === 'canceled'
      ? data.status
      : 'active';

  return {
    customerId: data.customerId ?? '',
    userId: data.assignedTo ?? data.userId ?? null,
    assignedTo: data.assignedTo ?? data.userId ?? null,
    createdBy: data.createdBy ?? null,
    assignedToUser: data.assignedToUser,
    createdByUser: data.createdByUser,
    capabilities: data.capabilities || { canView: true, canEdit: false, canReassign: false, canDelete: false, canPublish: false },
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
    customerImageUrl: data.customerImageUrl ?? null,
    imageCrop: data.imageCrop ?? null,
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
    deletedAt: data.deletedAt ?? null,
  };
};

// Central request (THROWS ON ERROR)
const apiRequest = async <T>(
  endpoint: string,
  method: string,
  data?: RequestPayload | FormData,
  isFormData: boolean = false,
  signal?: AbortSignal,
  retryTransient = false,
): Promise<T> => {
  const headers: HeadersInit = {
    'X-Application-Name': apiConfig.headers['X-Application-Name'],
  };

  // Only set Content-Type for non-FormData requests
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // Add auth token if available
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const attempts = retryTransient ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
        method,
        headers,
        credentials: 'include',
        cache: method.toUpperCase() === 'GET' ? 'no-store' : undefined,
        body: isFormData ? data as FormData : (data ? JSON.stringify(toApiFormat(data as RequestPayload)) : undefined),
        signal,
      });
      const requestId = response.headers.get('x-request-id') || undefined;
      let json: unknown = null;
      try { json = await response.json(); } catch { /* response may not contain JSON */ }

      if (response.ok) return json as T;
      const errorPayload = json && typeof json === 'object'
        ? json as { error?: string; message?: string; requestId?: string }
        : {};
      // A stale conditional request can still surface as 304 in older browser
      // sessions. There is no JSON body to consume, so retry once with the
      // no-store request policy instead of replacing the list with an empty UI.
      const transient = [304, 502, 503, 504].includes(response.status);
      if (transient && attempt + 1 < attempts) {
        await new Promise(resolve => window.setTimeout(resolve, 180));
        continue;
      }
      throw new CustomerRequestError(
        errorPayload.error || errorPayload.message || response.statusText,
        transient ? 'transient' : 'http',
        response.status,
        errorPayload.requestId || requestId,
      );
    } catch (error) {
      if (signal?.aborted || (error as Error)?.name === 'AbortError') {
        throw new CustomerRequestError('Request cancelled', 'aborted');
      }
      if (error instanceof CustomerRequestError) throw error;
      if (attempt + 1 < attempts) {
        await new Promise(resolve => window.setTimeout(resolve, 180));
        continue;
      }
      throw new CustomerRequestError(error instanceof Error ? error.message : 'Network request failed', 'transient');
    }
  }
  throw new CustomerRequestError('Network request failed', 'transient');
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
    status?: CustomerStatus,
    assignedTo?: number,
    createdBy?: number,
    missingImage?: boolean,
    signal?: AbortSignal,
  ): Promise<PaginatedCustomers> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(status && { status }),
      ...(assignedTo && { assignedTo: String(assignedTo) }),
      ...(createdBy && { createdBy: String(createdBy) }),
      ...(missingImage && { missingImage: 'true' }),
    });

    const result = await apiRequest<{
      data: ApiCustomer[];
      meta: PaginatedCustomers['meta'];
    }>(`/customers?${params}`, 'GET', undefined, false, signal, true);

    return {
      data: result.data.map(fromApiFormat),
      meta: result.meta,
    };
  },

  // List profile customers (always active)
  async getProfileCustomers(
    page = 1,
    limit = 100,
    search?: string
  ): Promise<PaginatedCustomers> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
    });

    const result = await apiRequest<{
      data: ApiCustomer[];
      meta: PaginatedCustomers['meta'];
    }>(`/customers/profile?${params}`, 'GET');

    return {
      data: result.data.map(fromApiFormat),
      meta: result.meta,
    };
  },

  // Get by id (requires authentication)
  getCustomerById: async (customerId: string): Promise<CustomerData> => {
    const response = await apiRequest<{ data: ApiCustomer }>(`/customers/${customerId}`, 'GET');
    return fromApiFormat(response.data);
  },

  // Get public customer profile (no authentication required)
  getPublicCustomerProfile: async (customerId: string): Promise<CustomerData> => {
    const response = await fetch(`${apiConfig.baseURL}/customers/public/${customerId}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(error.message || 'Failed to fetch customer profile');
    }
    
    const { data } = await response.json() as { data: ApiCustomer };
    return fromApiFormat(data);
  },

  // Create
  async createCustomer(
    customerData: Omit<CustomerData, 'customerId' | 'capabilities'> & { base64Image?: string }
  ): Promise<CustomerData> {
    // Create a copy of customerData to avoid mutating the original
    const requestData = { ...customerData };
    
    // If there's a base64Image, include it in the request
    if (customerData.base64Image) {
      requestData.base64Image = customerData.base64Image;
    }
    
    const result = await apiRequest<{ data: ApiCustomer }>('/customers', 'POST', requestData as unknown as RequestPayload);
    return fromApiFormat(result.data);
  },

  // Update
  async updateCustomer(
    customerId: string,
    customerData: Partial<Omit<CustomerData, 'customerId'>>
  ): Promise<CustomerData> {
    const result = await apiRequest<{ data: ApiCustomer }>(
      `/customers/${customerId}`,
      'PUT',
      customerData as unknown as RequestPayload
    );
    return fromApiFormat(result.data);
  },

  // Delete
  async deleteCustomer(customerId: string): Promise<void> {
    return apiRequest<void>(`/customers/${customerId}`, 'DELETE');
  },

  async reassignCustomer(customerId: string, assignedTo: number): Promise<CustomerData> {
    const result = await apiRequest<{ data: ApiCustomer }>(`/customers/${customerId}/assignee`, 'PUT', { assignedTo });
    return fromApiFormat(result.data);
  },

  async checkDuplicates(data: Partial<CustomerData>, excludeCustomerId?: string): Promise<{
    emailConflict: boolean;
    matches: Array<{ customerId: string; displayName: string; reasons: string[]; hardBlock: boolean }>;
  }> {
    const response = await apiRequest<{ data: { emailConflict: boolean; matches: Array<{ customerId: string; displayName: string; reasons: string[]; hardBlock: boolean }> } }>(
      '/customers/duplicate-check', 'POST', { ...data, excludeCustomerId } as RequestPayload,
    );
    return response.data;
  },

  async getTimeline(customerId: string): Promise<Array<{
    activityId: number; activityType: string; metadata: Record<string, unknown> | null; createdAt: string;
    actorUserId?: number; actorUserName?: string; actorUserLastName?: string; actorUserImageUrl?: string;
  }>> {
    const response = await apiRequest<{ data: Array<{ activityId: number; activityType: string; metadata: Record<string, unknown> | null; createdAt: string }> }>(
      `/customers/${customerId}/activities`, 'GET',
    );
    return response.data;
  },

  async bulkUpdateStatus(customerIds: string[], status: 'active' | 'inactive'): Promise<{ requested: number; updated: number }> {
    const response = await apiRequest<{ data: { requested: number; updated: number } }>('/customers/bulk/status', 'PATCH', { customerIds, status });
    return response.data;
  },

  async bulkDelete(customerIds: string[]): Promise<{ requested: number; updated: number }> {
    const response = await apiRequest<{ data: { requested: number; updated: number } }>('/customers/bulk/delete', 'POST', { customerIds });
    return response.data;
  },

  // Status stats
  async getStatusStats(): Promise<StatusStats> {
    const response = await apiRequest<{ success: boolean; data: StatusStats }>('/customers/status-stats', 'GET');
    if (!response.success) {
      throw new Error('Failed to fetch status stats');
    }
    return response.data;
  },

  // Upload customer image
  async uploadCustomerImage(customerId: string, file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    return apiRequest<{ imageUrl: string }>(
      `/customers/${customerId}/upload-image`,
      'POST',
      formData,
      true // isFormData flag
    );
  },

  // Delete customer image
  deleteCustomerImage(customerId: string): Promise<void> {
    return apiRequest<void>(`/customers/${customerId}/delete-image`, 'DELETE');
  },
};

export default customerApi;
