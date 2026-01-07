import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authApi from '../../api/auth.api';
import type { LoginResponse } from '../../types/api.types';
import type { RootState } from '../store';

/* =====================
   Types
===================== */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthUser {
  userId: number;
  userName: string;
  userEmail: string;
  userRole?: string;
}

export interface AuthError {
  message: string;
  status?: number;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;          // login / logout only
  checkingSession: boolean;  // ⬅️ gate rendering
  error: AuthError | null;
  lastActivity: string | null;
}

/* =====================
   Initial state
===================== */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  checkingSession: true, // ⬅️ start true
  error: null,
  lastActivity: null,
};

/* =====================
   Thunk
===================== */
export const loginUser = createAsyncThunk<
  LoginResponse,
  LoginCredentials,
  { rejectValue: AuthError }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authApi.login(credentials);
  } catch (err: any) {
    return rejectWithValue({
      message:
        err?.response?.data?.message ||
        err?.message ||
        'Login failed',
      status: err?.response?.status,
    });
  }
});

/* =====================
   Slice
===================== */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /* Restore session (app load only) */
    restoreSession: (state, action: PayloadAction<LoginResponse>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.checkingSession = false;
      state.lastActivity = new Date().toISOString();
    },

    /* Clear auth WITHOUT calling logout */
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.checkingSession = false;
      state.error = null;
      state.lastActivity = null;
    },

    /* User explicitly logs out */
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.checkingSession = false;
      state.error = null;
      state.lastActivity = null;
    },

    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    clearAuthError: (state) => {
      state.error = null;
    },

    updateLastActivity: (state) => {
      state.lastActivity = new Date().toISOString();
    },
  },

  extraReducers: (builder) => {
    builder
      /* LOGIN */
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.loading = false;
        state.checkingSession = false;
        state.lastActivity = new Date().toISOString();
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? { message: 'Login failed' };
      });
  },
});

/* =====================
   Exports
===================== */
export const {
  restoreSession,
  clearAuth,
  logout,
  updateUser,
  clearAuthError,
  updateLastActivity,
} = authSlice.actions;

export default authSlice.reducer;

/* =====================
   Selectors (FIXED)
===================== */
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectLastActivity = (state: { auth: AuthState }) =>
  state.auth.lastActivity;
export const selectCheckingSession = (state: { auth: AuthState }) =>
  state.auth.checkingSession;
