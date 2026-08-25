import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Customer, CustomerData, CustomerStatus } from '../../types/customer.types';
import customerApi, { CustomerRequestError } from '../../services/api/customerApi';
import type { RootState } from '../store';
import {
  buildCustomerListRequest,
  initialCustomerListFilter,
  type CustomerListFilter,
} from '../../utils/customerListFilter';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/* ============================
   State
============================ */

export interface StatusStat {
  status: 'active' | 'inactive' | 'canceled';
  count: number;
}

export interface StatusStats {
  statuses: StatusStat[];
  totalStatus: number;
}

interface CustomerState {
  items: Customer[];
  currentItem: Customer | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: CustomerListError | null;
  total: number;
  page: number;
  pageSize: number;
  statusStats: StatusStats | null;
  activeListRequestId: string | null;
  lastSuccessfulAt: string | null;
  filter: CustomerListFilter;
}

export interface CustomerListError {
  message: string;
  requestId?: string;
  kind: 'transient' | 'http';
}

const initialState: CustomerState = {
  items: [],
  currentItem: null,
  status: 'idle',
  error: null,
  total: 0,
  page: 1,
  pageSize: 25,
  statusStats: null,
  activeListRequestId: null,
  lastSuccessfulAt: null,
  filter: initialCustomerListFilter,
};

/* ============================
   Helpers
============================ */

const toCustomer = (data: CustomerData): Customer => {
  const status: CustomerStatus =
    data.status === 'active' || data.status === 'inactive' || data.status === 'canceled'
      ? data.status
      : 'active';

  return {
    ...data,
    status,
    isActive: status === 'active',
    fullName: `${data.customerName} ${data.customerLastName || ''}`.trim(),
  };
};

/* ============================
   Thunks
============================ */

interface FetchCustomersParams extends Partial<CustomerListFilter> {
  page?: number;
  limit?: number;
}

export const fetchStatusStats = createAsyncThunk<StatusStats, void, { rejectValue: string }>(
  'customers/fetchStatusStats',
  async (_, { rejectWithValue }) => {
    try {
      const statusStats = await customerApi.getStatusStats();
      return statusStats;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to fetch status stats'));
    }
  }
);

export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params: FetchCustomersParams = {}, { getState, rejectWithValue, signal }) => {
    try {
      const state = getState() as RootState;
      const customer = state.customer;

      const page = params.page ?? customer.page;
      const limit = params.limit ?? customer.pageSize;
      const request = buildCustomerListRequest({ ...customer.filter, ...params }, page, limit);
      const response = await customerApi.getCustomers(
        request.page,
        request.limit,
        request.search,
        request.status,
        request.assignedTo,
        request.createdBy,
        request.missingImage,
        signal,
      );

      return {
        items: response.data.map(toCustomer),
        total: response.meta.total,
        page: response.meta.page,
        pageSize: response.meta.limit,
      };
    } catch (err: unknown) {
      if (err instanceof CustomerRequestError && err.kind === 'aborted') throw err;
      const failure = err instanceof CustomerRequestError ? err : null;
      return rejectWithValue({
        message: getErrorMessage(err, 'Failed to fetch customers'),
        requestId: failure?.requestId,
        kind: failure?.kind === 'http' ? 'http' : 'transient',
      } satisfies CustomerListError);
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await customerApi.getCustomerById(id);
      return toCustomer(data);
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to fetch customer'));
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (data: Omit<CustomerData, 'customerId' | 'capabilities'>, { rejectWithValue }) => {
    try {
      const result = await customerApi.createCustomer(data);
      return toCustomer(result);
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to create customer'));
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async (
    { id, data }: { id: string; data: Partial<CustomerData> },
    { rejectWithValue }
  ) => {
    try {
      const result = await customerApi.updateCustomer(id, data);
      return toCustomer(result);
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to update customer'));
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      await customerApi.deleteCustomer(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, 'Failed to delete customer'));
    }
  }
);

/* ============================
   Slice
============================ */

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
      state.page = 1;
    },
    setFilter(state, action: PayloadAction<Partial<CustomerListFilter>>) {
      state.filter = {
        ...state.filter,
        ...action.payload,
      };
      state.page = 1;
    },
    resetCustomerState: () => initialState,
    setStatusStats(state, action: PayloadAction<StatusStats>) {
      state.statusStats = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.activeListRequestId = action.meta.requestId;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        if (state.activeListRequestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.activeListRequestId = null;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.error = null;
        state.lastSuccessfulAt = new Date().toISOString();
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        if (state.activeListRequestId !== action.meta.requestId) return;
        if (action.meta.aborted || action.error.name === 'AbortError' || action.error.message === 'Request cancelled') {
          state.status = state.lastSuccessfulAt ? 'succeeded' : 'idle';
          state.activeListRequestId = null;
          return;
        }
        state.status = 'failed';
        state.activeListRequestId = null;
        state.error = action.payload as CustomerListError;
      })
      .addCase(fetchStatusStats.fulfilled, (state, action) => {
        state.statusStats = action.payload;
      })
      .addCase(fetchStatusStats.rejected, () => undefined)
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        // iOS 2026: After creating customer, reset pagination state
        // This ensures the next refetch() will get all customers with correct limit (100)
        state.page = 1;
        state.pageSize = 25;
        // Add new customer to the list (will be replaced by refetch)
        state.items.unshift(action.payload);
        state.total += 1;
      })

      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (c) => c.customerId === action.payload.customerId
        );
        if (index !== -1) state.items[index] = action.payload;
        if (state.currentItem?.customerId === action.payload.customerId) {
          state.currentItem = action.payload;
        }
      })

      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.customerId !== action.payload);
        state.total = Math.max(0, state.total - 1);
      });
  },
});

export const {
  setPage,
  setPageSize,
  setFilter,
  resetCustomerState,
} = customerSlice.actions;

export default customerSlice.reducer;
