import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Customer, CustomerData, CustomerStatus } from '../../types/customer.types';
import customerApi from '../../services/api/customerApi';

// Define the shape of the customer state
interface CustomerState {
  items: Customer[];
  currentItem: Customer | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
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
  pageSize: 10,
  filter: {
    status: 'all',
    search: '',
  },
};

// Types for fetch parameters
interface FetchCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
}

// Helper function to transform API customer data to our Customer type
const toCustomer = (data: CustomerData): Customer => ({
  ...data,
  fullName: `${data.customerName} ${data.customerLastName || ''}`.trim(),
});

// Async thunks
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params: FetchCustomersParams = {}, { getState }) => {
    const { customer } = getState() as { customer: CustomerState };
    const { page, pageSize, filter } = customer;

    // Use provided params or fall back to state
    const queryParams = {
      page: params.page ?? page,
      limit: params.limit ?? pageSize,
      search: params.search ?? filter.search,
      status: params.status ?? (filter.status === 'all' ? undefined : filter.status),
    };

    const response = await customerApi.getCustomers(
      queryParams.page,
      queryParams.limit,
      queryParams.search,
      queryParams.status as 'active' | 'inactive' | undefined,
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch customers');
    }

    return {
      data: Array.isArray(response.data) ? response.data.map(toCustomer) : [],
      meta: response.meta || {
        total: 0,
        page: queryParams.page,
        limit: queryParams.limit,
        totalPages: 1,
      },
    };
  },
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string) => {
    const response = await customerApi.getCustomerById(id);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch customer');
    }
    return toCustomer(response.data);
  },
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData: Omit<CustomerData, 'customerId'>) => {
    const response = await customerApi.createCustomer(customerData);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create customer');
    }
    return toCustomer(response.data);
  },
);

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, data }: { id: string; data: Partial<CustomerData> }) => {
    const response = await customerApi.updateCustomer(id, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update customer');
    }
    return toCustomer(response.data);
  },
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string) => {
    const response = await customerApi.deleteCustomer(id);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete customer');
    }
    return id;
  },
);

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.page = 1; // Reset to first page when page size changes
    },
    setFilter: (
      state,
      action: PayloadAction<{ status?: CustomerStatus | 'all'; search?: string }>,
    ) => {
      if (action.payload.status !== undefined) {
        state.filter.status = action.payload.status;
      }
      if (action.payload.search !== undefined) {
        state.filter.search = action.payload.search;
      }
      state.page = 1; // Reset to first page when filters change
    },
    resetCustomerState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Customers
      .addCase(fetchCustomers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.data;
        state.total = action.payload.meta.total;
        state.page = action.payload.meta.page;
        state.pageSize = action.payload.meta.limit;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch customers';
      })
      // Fetch Customer By Id
      .addCase(fetchCustomerById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch customer';
      })
      // Create Customer
      .addCase(createCustomer.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          state.items = [action.payload, ...state.items];
          state.total += 1;
        }
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to create customer';
      })
      // Update Customer
      .addCase(updateCustomer.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          const index = state.items.findIndex(
            (item) => item.customerId === action.payload?.customerId,
          );
          if (index !== -1) {
            state.items[index] = action.payload;
          }
          // Also update currentItem if it's the one being updated
          if (state.currentItem?.customerId === action.payload.customerId) {
            state.currentItem = action.payload;
          }
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to update customer';
      })
      // Delete Customer
      .addCase(deleteCustomer.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter((item) => item.customerId !== action.payload);
        state.total = Math.max(0, state.total - 1);
        // Clear currentItem if it's the one being deleted
        if (state.currentItem?.customerId === action.payload) {
          state.currentItem = null;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to delete customer';
      });
  },
});

export const { setPage, setPageSize, setFilter, resetCustomerState } = customerSlice.actions;

export default customerSlice.reducer;
