import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Customer, CustomerData, CustomerStatus } from '../../types/customer.types';
import customerApi from '../../services/api/customerApi';

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
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  statusStats: StatusStats | null;
  filter: {
    status: CustomerStatus | 'all';
    search: string;
  };
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
  filter: {
    status: 'all',
    search: '',
  },
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

interface FetchCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
}

export const fetchStatusStats = createAsyncThunk<StatusStats, void, { rejectValue: string }>(
  'customers/fetchStatusStats',
  async (_, { rejectWithValue }) => {
    try {
      const statusStats = await customerApi.getStatusStats();
      return statusStats;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch status stats');
    }
  }
);

export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params: FetchCustomersParams = {}, { getState, dispatch, rejectWithValue }) => {
    dispatch(fetchStatusStats());
    try {
      const { customer } = getState() as { customer: CustomerState };

      const page = params.page ?? customer.page;
      const limit = params.limit ?? customer.pageSize;
      const search = params.search ?? customer.filter.search;

      const status =
        params.status && params.status !== 'all'
          ? params.status
          : customer.filter.status !== 'all'
          ? customer.filter.status
          : undefined;

      const response = await customerApi.getCustomers(
        page,
        limit,
        search,
        status,
      );

      return {
        items: response.data.map(toCustomer),
        total: response.meta.total,
        page: response.meta.page,
        pageSize: response.meta.limit,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch customers');
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await customerApi.getCustomerById(id);
      return toCustomer(data);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch customer');
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (data: Omit<CustomerData, 'customerId'>, { rejectWithValue }) => {
    try {
      const result = await customerApi.createCustomer(data);
      return toCustomer(result);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to create customer');
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
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update customer');
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      await customerApi.deleteCustomer(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to delete customer');
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
    setFilter(
      state,
      action: PayloadAction<{ status?: CustomerStatus | 'all'; search?: string }>
    ) {
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
      .addCase(fetchCustomers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(fetchStatusStats.fulfilled, (state, action) => {
        state.statusStats = action.payload;
      })
      .addCase(fetchStatusStats.rejected, (state, action) => {
        state.statusStats = {
          statuses: [
            { status: 'active', count: 0 },
            { status: 'inactive', count: 0 },
            { status: 'canceled', count: 0 },
          ],
          totalStatus: 0,
        };
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
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
