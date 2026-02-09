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
  // Load customers and status stats
  // ===============================
  const loadData = useCallback(() => {
    dispatch(fetchCustomers({ 
      page, 
      limit: pageSize, 
      status: filter.status === 'all' ? undefined : filter.status,
      search: filter.search 
    }));
    dispatch(fetchStatusStats());
  }, [dispatch, page, pageSize, filter.status, filter.search]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===============================
  // Pagination and filtering
  // ===============================
  const handlePageChange = useCallback(
    (newPage: number) => {
      dispatch(setPage(newPage));
    },
    [dispatch]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      dispatch(setPageSize(newSize));
      dispatch(setPage(1));
    },
    [dispatch]
  );

  const handleFilterChange = useCallback((newFilter: { status?: CustomerStatus | 'all'; search?: string }) => {
    const updatedFilter = { ...filter, ...newFilter };
    dispatch(setFilter(updatedFilter));
    // Reset to first page when filters change
    dispatch(setPage(1));
  }, [dispatch, filter]);

  // ===============================
  // Refetch data
  // ===============================
  const refetch = useCallback(() => {
    const params = {
      page,
      limit: pageSize,
      status: filter.status === 'all' ? undefined : filter.status,
      search: filter.search || undefined,
    };
    
    dispatch(fetchCustomers(params));
    dispatch(fetchStatusStats());
  }, [dispatch, page, pageSize, filter.status, filter.search]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

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
        return { success: false, message: err.message || 'Create failed' };
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
        return { success: false, message: err.message || 'Update failed' };
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
  
  // Debug log to check the status stats
  useEffect(() => {
  }, [statusStats, getStatusCount]);

  // Refetch data when page or pageSize changes
  useEffect(() => {
    refetch();
  }, [page, pageSize, refetch]);

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
