import { useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
  fetchCustomers,
  setPage,
  setPageSize,
  setFilter,
  createCustomer as createCustomerAction,
  updateCustomer as updateCustomerAction,
  deleteCustomer as deleteCustomerAction,
  fetchStatusStats,
} from '../store/slices/customerSlice';
import { Customer } from '../types/customer.types';
import { buildCustomerListRequest, mergeCustomerListFilter, type CustomerListFilter } from '../utils/customerListFilter';

/**
 * iOS 2026 Design Pattern - Search & Pagination
 * 
 * Principles:
 * 1. Default limit = 100 (show all data up to 100 items)
 * 2. Search returns all matching results (no pagination)
 * 3. Clear search instantly resets to default state
 * 4. No pagination memory - always reset on filter change
 */
const DEFAULT_LIMIT = 25;

const getErrorDetails = (error: unknown): unknown => {
  if (typeof error !== 'object' || error === null) return error;
  const record = error as Record<string, unknown>;
  return record.error ?? record.message ?? error;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  const details = getErrorDetails(error);
  return typeof details === 'string' ? details : fallback;
};

export const useCustomers = () => {
  const dispatch = useAppDispatch();
  const activeFetch = useRef<{ abort: () => void } | null>(null);
  const runFetch = useCallback((params: Parameters<typeof fetchCustomers>[0]) => {
    activeFetch.current?.abort?.();
    const request = dispatch(fetchCustomers(params));
    activeFetch.current = request;
    return request;
  }, [dispatch]);

  const {
    items: customers,
    status,
    error,
    page,
    pageSize,
    total,
    filter,
    statusStats,
    lastSuccessfulAt,
  } = useAppSelector((state) => state.customer);

  // ===============================
  // Pagination and filtering
  // ===============================
  const requestFor = useCallback((nextFilter: CustomerListFilter, nextPage: number, nextLimit: number) =>
    buildCustomerListRequest(nextFilter, nextPage, nextLimit), []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      dispatch(setPage(newPage));
      runFetch(requestFor(filter, newPage, pageSize));
    },
    [dispatch, filter, pageSize, requestFor, runFetch]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      dispatch(setPageSize(newSize));
      dispatch(setPage(1));
      runFetch(requestFor(filter, 1, newSize));
    },
    [dispatch, filter, requestFor, runFetch]
  );

  /**
   * iOS 2026: Reset pageSize to default when clearing search
   * This ensures that after clearing search, we show all data (up to 100 items)
   */
  const handleFilterChange = useCallback((newFilter: Partial<CustomerListFilter> & { limit?: number }) => {
    const { limit, ...filterPatch } = newFilter;
    const updatedFilter = mergeCustomerListFilter(filter, filterPatch);
    dispatch(setFilter(updatedFilter));
    // Reset to first page when filters change
    dispatch(setPage(1));
    
    // iOS 2026: When clearing search, reset to default limit (100)
    // This ensures we show all data after clearing search
    const isClearingSearch = 'search' in filterPatch && (!filterPatch.search || filterPatch.search.trim() === '');
    const limitToUse = isClearingSearch ? DEFAULT_LIMIT : (limit ?? pageSize);
    
    // Refetch data when filter changes
    runFetch(requestFor(updatedFilter, 1, limitToUse));
    
    // Also fetch status stats to update tab counts
    dispatch(fetchStatusStats());
  }, [dispatch, filter, pageSize, requestFor, runFetch]);

  // ===============================
  // Refetch data
  // ===============================
  /**
   * iOS 2026: Refetch always uses current state values
   * This ensures we get the latest data with correct pagination
   */
  const refetch = useCallback(() => {
    // Read latest values from selector to avoid stale closure
    runFetch(requestFor(filter, 1, pageSize || DEFAULT_LIMIT));
    dispatch(fetchStatusStats());
  }, [dispatch, filter, pageSize, requestFor, runFetch]);

  // ===============================
  // CRUD
  // ===============================
  const createCustomer = useCallback(
    async (data: Omit<Customer, 'customerId' | 'fullName' | 'capabilities'>) => {
      try {
        const result = await dispatch(createCustomerAction(data)).unwrap();
        dispatch(fetchStatusStats());
        return { success: true, data: result };
      } catch (err: unknown) {
        // Parse error message to provide user-friendly feedback
        let errorMessage = 'Failed to create customer';
        
        // Extract error message from various possible formats
        const errorDetails = getErrorDetails(err);
        
        if (typeof errorDetails === 'string') {
          if (errorDetails.includes('email already exists') || errorDetails.includes('duplicate')) {
            errorMessage = 'This email is already registered. Please use a different email address.';
          } else if (errorDetails.includes('name already exists')) {
            errorMessage = 'This name is already registered. Please use a different name.';
          } else if (errorDetails.includes('customerEmail')) {
            errorMessage = 'Invalid email address. Please check and try again.';
          } else if (errorDetails.includes('customerName')) {
            errorMessage = 'Invalid name. Please check and try again.';
          } else {
            errorMessage = errorDetails;
          }
        }
        
        return { success: false, message: errorMessage };
      }
    },
    [dispatch]
  );

  const updateCustomer = useCallback(
    async (id: string, data: Partial<Omit<Customer, 'customerId' | 'fullName' | 'capabilities'>>) => {
      try {
        const result = await dispatch(updateCustomerAction({ id, data })).unwrap();
        dispatch(fetchStatusStats());
        return { success: true, data: result };
      } catch (err: unknown) {
        // Parse error message to provide user-friendly feedback
        let errorMessage = 'Failed to update customer';
        
        // Extract error message from various possible formats
        const errorDetails = getErrorDetails(err);
        
        if (typeof errorDetails === 'string') {
          if (errorDetails.includes('email already exists') || errorDetails.includes('duplicate') || errorDetails.includes('Email is already in use')) {
            errorMessage = 'This email is already registered. Please use a different email address.';
          } else if (errorDetails.includes('name already exists')) {
            errorMessage = 'This name is already registered. Please use a different name.';
          } else if (errorDetails.includes('customerEmail')) {
            errorMessage = 'Invalid email address. Please check and try again.';
          } else {
            errorMessage = errorDetails;
          }
        }
        
        return { success: false, message: errorMessage };
      }
    },
    [dispatch]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      try {
        await dispatch(deleteCustomerAction(id)).unwrap();
        dispatch(fetchStatusStats());
        return { success: true };
      } catch (err: unknown) {
        return { success: false, message: getErrorMessage(err, 'Delete failed') };
      }
    },
    [dispatch]
  );



  // Get count for a specific status
  const getStatusCount = useCallback((status: 'active' | 'inactive' | 'canceled'): number => {
    if (!statusStats?.statuses) return 0;
    const statusData = statusStats.statuses.find(s => s.status === status);
    return statusData?.count || 0;
  }, [statusStats]);
  


  return {
    customers,
    loading: status === 'loading',
    error,
    page,
    pageSize,
    total,
    filter,
    statusStats,
    lastSuccessfulAt,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch,
    getStatusCount,
  };
};

export default useCustomers;
