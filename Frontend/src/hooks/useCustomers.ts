import { useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { 
  fetchCustomers, 
  setPage, 
  setPageSize, 
  setFilter, 
  createCustomer as createCustomerAction,
  updateCustomer as updateCustomerAction,
  deleteCustomer as deleteCustomerAction
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
    filter 
  } = useAppSelector((state) => state.customer);

  // Load customers when component mounts or when page/pageSize/filter changes
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const queryParams: {
          page?: number;
          limit?: number;
          search?: string;
          status?: CustomerStatus;
        } = {
          page,
          limit: pageSize,
          search: filter.search || undefined,
        };

        // Only add status if it's not 'all'
        if (filter.status !== 'all') {
          queryParams.status = filter.status;
        }

        await dispatch(fetchCustomers(queryParams));
      } catch (error) {
        console.error('Failed to load customers:', error);
      }
    };
    
    loadCustomers();
  }, [dispatch, page, pageSize, filter.status, filter.search]);

  const handlePageChange = useCallback((newPage: number) => {
    dispatch(setPage(newPage));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize(newPageSize));
  }, [dispatch]);

  const handleFilterChange = useCallback((newFilter: { status?: CustomerStatus | 'all'; search?: string }) => {
    dispatch(setFilter(newFilter));
  }, [dispatch]);

  const createCustomer = useCallback(async (customerData: Omit<Customer, 'customerId' | 'fullName'>) => {
    try {
      const result = await dispatch(createCustomerAction(customerData)).unwrap();
      return { 
        success: true, 
        data: result 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to create customer' 
      };
    }
  }, [dispatch]);

  const updateCustomer = useCallback(async (id: string, customerData: Partial<Omit<Customer, 'customerId' | 'fullName'>>) => {
    try {
      const result = await dispatch(updateCustomerAction({ 
        id, 
        data: customerData 
      })).unwrap();
      
      return { 
        success: true, 
        data: result 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to update customer' 
      };
    }
  }, [dispatch]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await dispatch(deleteCustomerAction(id)).unwrap();
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to delete customer' 
      };
    }
  }, [dispatch]);

  // Memoize the customers data to prevent unnecessary re-renders
  const memoizedCustomers = useMemo(() => customers, [customers]);

  return {
    customers: memoizedCustomers,
    loading: status === 'loading',
    error,
    page,
    pageSize,
    total,
    filter,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};

export default useCustomers;
