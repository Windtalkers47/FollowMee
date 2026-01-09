// Base customer interface that matches the API response
export interface CustomerData {
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
  deletedAt: string | null;
}

// Extended interface for the frontend with computed properties
export interface Customer extends CustomerData {
  fullName: string;
}

// DTOs for creating and updating customers
export interface CreateCustomerDto {
  customerName: string;
  customerLastName?: string | null;
  customerEmail: string;
  customerPhone1?: string | null;
  customerPhone2?: string | null;
  customerFacebook?: string | null;
  customerInstagram?: string | null;
  customerTikTok?: string | null;
  customerLine?: string | null;
  customerX?: string | null;
  isActive?: boolean;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  customerId: string;
}

// API response types
export interface ApiResponse<T> {
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

// Customer state for Redux
export interface CustomerState {
  items: Customer[];
  currentItem: Customer | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  filter: {
    status: CustomerStatus;
    search: string;
  };
}

// Type for customer status filter
export type CustomerStatus = 'active' | 'inactive' | 'all';

// Type for customer form data
export interface CustomerFormData extends Omit<CreateCustomerDto, 'isActive'> {
  isActive: boolean;
}

// Type for customer table row
export interface CustomerTableRow extends Customer {
  key: string;
}

// Type for customer filters
export interface CustomerFilters {
  status?: CustomerStatus;
  search?: string;
  page?: number;
  limit?: number;
}
