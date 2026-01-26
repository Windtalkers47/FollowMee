import { useEffect, useCallback, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
  fetchCustomers,
  setPage,
  setPageSize,
  setFilter,
  createCustomer as createCustomerAction,
  updateCustomer as updateCustomerAction,
  deleteCustomer as deleteCustomerAction,
} from '../store/slices/customerSlice';
import { Customer, CustomerStatus } from '../types/customer.types';
import {
  customerApi,
  StatusStat,
} from '../services/api/customerApi';

type StatusStatsState = {
  statuses: StatusStat[];
  totalStatus: number;
};

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
  } = useAppSelector((state) => state.customer);

  const [statusStats, setStatusStats] = useState<StatusStatsState>({
    statuses: [
      { status: 'active', count: 0 },
      { status: 'inactive', count: 0 },
      { status: 'canceled', count: 0 },
    ],
    totalStatus: 0,
  });

  // ===============================
  // Load customers
  // ===============================
  useEffect(() => {
    const params: {
      page: number;
      limit: number;
      search?: string;
      status?: CustomerStatus;
    } = {
      page,
      limit: pageSize,
      search: filter.search || undefined,
    };

    if (filter.status !== 'all') {
      params.status = filter.status;
    }

    dispatch(fetchCustomers(params));
  }, [dispatch, page, pageSize, filter.status, filter.search]);

  // ===============================
  // Pagination & filters
  // ===============================
  const handlePageChange = useCallback(
    (newPage: number) => dispatch(setPage(newPage)),
    [dispatch]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => dispatch(setPageSize(newSize)),
    [dispatch]
  );

  const handleFilterChange = useCallback(
    (newFilter: { status?: CustomerStatus | 'all'; search?: string }) =>
      dispatch(setFilter(newFilter)),
    [dispatch]
  );

  // ===============================
  // CRUD
  // ===============================
  const createCustomer = useCallback(
    async (data: Omit<Customer, 'customerId' | 'fullName'>) => {
      try {
        const result = await dispatch(createCustomerAction(data)).unwrap();
        return { success: true, data: result };
      } catch (err: any) {
        return { success: false, message: err.message || 'Create failed' };
      }
    },
    [dispatch]
  );

  const updateCustomer = useCallback(
    async (
      id: string,
      data: Partial<Omit<Customer, 'customerId' | 'fullName'>>
    ) => {
      try {
        const result = await dispatch(
          updateCustomerAction({ id, data })
        ).unwrap();
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
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err.message || 'Delete failed' };
      }
    },
    [dispatch]
  );

  // ===============================
  // Status stats
  // ===============================
  const fetchStatusStats = useCallback(async () => {
    try {
      const data = await customerApi.getStatusStats();
  
      const defaults: StatusStat[] = [
        { status: 'active', count: 0 },
        { status: 'inactive', count: 0 },
        { status: 'canceled', count: 0 },
      ];
  
      const merged = defaults.map((d) => {
        const found = data.statuses.find((s) => s.status === d.status);
        return found ?? d;
      });
  
      setStatusStats({
        statuses: merged,
        totalStatus: data.totalStatus,
      });
    } catch (error) {
      console.error('Failed to fetch status stats', error);
    }
  }, []);

  useEffect(() => {
    fetchStatusStats();
  }, [fetchStatusStats]);

  // ===============================
  // Refetch
  // ===============================
  const refetch = useCallback(() => {
    dispatch(
      fetchCustomers({
        page: 1,
        limit: pageSize,
        search: filter.search || undefined,
        status: filter.status !== 'all' ? filter.status : undefined,
      })
    );
    fetchStatusStats();
  }, [dispatch, pageSize, filter.search, filter.status, fetchStatusStats]);

  // ===============================
  // Memoized customers
  // ===============================
  const memoizedCustomers = useMemo(() => customers, [customers]);

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
    refetch,
  };
};

export default useCustomers;
