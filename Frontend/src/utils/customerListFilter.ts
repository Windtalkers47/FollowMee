import type { CustomerStatus } from '../types/customer.types';

export type CustomerStatusFilter = CustomerStatus | 'all';

export interface CustomerListFilter {
  status: CustomerStatusFilter;
  search: string;
  assignedTo?: number;
  createdBy?: number;
  missingImage: boolean;
}

export interface CustomerListRequest {
  page: number;
  limit: number;
  status?: CustomerStatus;
  search?: string;
  assignedTo?: number;
  createdBy?: number;
  missingImage?: boolean;
}

export const initialCustomerListFilter: CustomerListFilter = {
  status: 'all',
  search: '',
  assignedTo: undefined,
  createdBy: undefined,
  missingImage: false,
};

export const mergeCustomerListFilter = (
  current: CustomerListFilter,
  patch: Partial<CustomerListFilter>,
): CustomerListFilter => ({ ...current, ...patch });

export const buildCustomerListRequest = (
  filter: CustomerListFilter,
  page: number,
  limit: number,
): CustomerListRequest => ({
  page,
  limit,
  status: filter.status === 'all' ? undefined : filter.status,
  search: filter.search || undefined,
  assignedTo: filter.assignedTo,
  createdBy: filter.createdBy,
  missingImage: filter.missingImage || undefined,
});
