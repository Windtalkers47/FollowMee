import { useEffect, useCallback } from 'react';
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
import { Customer, CustomerStatus } from '../types/customer.types';

/**
 * iOS 2026 Design Pattern - Search & Pagination
 * 
 * Principles:
 * 1. Default limit = 100 (show all data up to 100 items)
 * 2. Search returns all matching results (no pagination)
 * 3. Clear search instantly resets to default state
 * 4. No pagination memory - always reset on filter change
 */
const iOS_DEFAULT_LIMIT = 100;

export const useCustomers = () => {
  const dispatch = useAppDispatch();

  const {
    items: customers,
    status,
    error,
    page,
    pageSize,
    total,
    filter,
    statusStats,
  } = useAppSelector((state) => state.customer);

  // ===============================
  // Pagination and filtering
  // ===============================
  const handlePageChange = useCallback(
    (newPage: number) => {
      dispatch(setPage(newPage));
      // Refetch data when page changes
      dispatch(fetchCustomers({ 
        page: newPage, 
        limit: pageSize, 
        status: filter.status === 'all' ? undefined : filter.status,
        search: filter.search 
      }));
    },
    [dispatch, pageSize, filter.status, filter.search]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      dispatch(setPageSize(newSize));
      dispatch(setPage(1));
      // Refetch data when page size changes
      dispatch(fetchCustomers({ 
        page: 1, 
        limit: newSize, 
        status: filter.status === 'all' ? undefined : filter.status,
        search: filter.search 
      }));
    },
    [dispatch, filter.status, filter.search]
  );

  /**
   * iOS 2026: Reset pageSize to default when clearing search
   * This ensures that after clearing search, we show all data (up to 100 items)
   */
  const handleFilterChange = useCallback((newFilter: { status?: CustomerStatus | 'all'; search?: string; limit?: number }) => {
    const updatedFilter = { ...filter, ...newFilter };
    dispatch(setFilter(updatedFilter));
    // Reset to first page when filters change
    dispatch(setPage(1));
    
    // iOS 2026: When clearing search, reset to default limit (100)
    // This ensures we show all data after clearing search
    const isClearingSearch = !newFilter.search || newFilter.search.trim() === '';
    const limitToUse = isClearingSearch ? iOS_DEFAULT_LIMIT : (newFilter.limit ?? pageSize);
    
    // Refetch data when filter changes
    dispatch(fetchCustomers({ 
      page: 1, 
      limit: limitToUse, 
      status: updatedFilter.status === 'all' ? undefined : updatedFilter.status,
      search: updatedFilter.search 
    }));
    
    // Also fetch status stats to update tab counts
    dispatch(fetchStatusStats());
  }, [dispatch, pageSize, filter]);

  // ===============================
  // Refetch data
  // ===============================
  /**
   * iOS 2026: Refetch always uses current state values
   * This ensures we get the latest data with correct pagination
   */
  const refetch = useCallback(() => {
    // Read latest values from selector to avoid stale closure
    const currentState = { 
      page: 1, // Always refetch from page 1
      limit: iOS_DEFAULT_LIMIT, // iOS 2026: Always use default limit (100)
      status: filter.status === 'all' ? undefined : filter.status,
      search: filter.search || undefined,
    };
    
    dispatch(fetchCustomers(currentState));
    dispatch(fetchStatusStats());
  }, [dispatch, filter.status, filter.search]);

  // ===============================
  // CRUD
  // ===============================
  const createCustomer = useCallback(
    async (data: Omit<Customer, 'customerId' | 'fullName'>) => {
      try {
        const result = await dispatch(createCustomerAction(data)).unwrap();
        dispatch(fetchStatusStats());
        return { success: true, data: result };
      } catch (err: any) {
        // Parse error message to provide user-friendly feedback
        let errorMessage = 'Failed to create customer';
        
        // Extract error message from various possible formats
        const errorDetails = err?.error || err?.message || err;
        
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
    async (id: string, data: Partial<Omit<Customer, 'customerId' | 'fullName'>>) => {
      try {
        const result = await dispatch(updateCustomerAction({ id, data })).unwrap();
        dispatch(fetchStatusStats());
        return { success: true, data: result };
      } catch (err: any) {
        // Parse error message to provide user-friendly feedback
        let errorMessage = 'Failed to update customer';
        
        // Extract error message from various possible formats
        const errorDetails = err?.error || err?.message || err;
        
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
      } catch (err: any) {
        return { success: false, message: err.message || 'Delete failed' };
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
