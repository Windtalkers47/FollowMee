import { useEffect, useCallback, useMemo, useState } from 'react';
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
import { customerApi } from '../services/api/customerApi';

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
  
  const [statusStats, setStatusStats] = useState<{
    statuses: Array<{ status: 'active' | 'inactive' | 'canceled'; count: number }>;
    totalStatus: number;
  } | null>(null);

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

  // Fetch status statistics
  const fetchStatusStats = useCallback(async () => {
    try {
      const response = await customerApi.getStatusStats();
      
      if (response.success && response.data) {
        const statuses: Array<{ status: 'active' | 'inactive' | 'canceled'; count: number }> = 
          Array.isArray(response.data.statuses) ? response.data.statuses : [];
          
        const totalStatus = typeof response.data.totalStatus === 'number'
          ? response.data.totalStatus
          : statuses.reduce((sum: number, stat: { count: number }) => sum + (stat.count || 0), 0);
          
        const defaultStatuses = [
          { status: 'active' as const, count: 0 },
          { status: 'inactive' as const, count: 0 },
          { status: 'canceled' as const, count: 0 }
        ];
        
        const mergedStatuses = defaultStatuses.map(defaultStat => {
          const found = statuses.find((s: { status: string }) => s.status === defaultStat.status);
          return found || defaultStat;
        });
        
        const stats = {
          statuses: mergedStatuses,
          totalStatus
        };
        
        setStatusStats(stats);
        return { success: true, data: stats };
      } else {
        console.error('Failed to fetch status stats:', response.message);
        // Return default values on failure
        const defaultStats = {
          statuses: [
            { status: 'active' as const, count: 0 },
            { status: 'inactive' as const, count: 0 },
            { status: 'canceled' as const, count: 0 },
          ],
          totalStatus: 0
        };
        setStatusStats(defaultStats);
        return { success: false, message: response?.message || 'Failed to fetch status stats', data: defaultStats };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in fetchStatusStats:', error);
      // Return default values on error
      const defaultStats = {
        statuses: [
          { status: 'active' as const, count: 0 },
          { status: 'inactive' as const, count: 0 },
          { status: 'canceled' as const, count: 0 },
        ],
        totalStatus: 0
      };
      setStatusStats(defaultStats);
      return { success: false, message: errorMessage, data: defaultStats };
    }
  }, []);

  // Load status stats on mount
  useEffect(() => {
    fetchStatusStats();
  }, [fetchStatusStats]);



  return {
    customers: memoizedCustomers,
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
  };
};

export default useCustomers;
