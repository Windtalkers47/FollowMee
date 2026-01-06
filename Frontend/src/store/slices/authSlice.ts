import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface User {
  userId: number;
  userName: string;
  userLastName: string;
  userEmail: string;
  userPhone1?: string | null;
  userPhone2?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userRole?: string | null;
  resetToken?: string | null;
  resetTokenExpires?: string | null;
  // Helper computed property (not stored in DB)
  fullName?: string;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: AuthError | null;
  lastActivity: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  lastActivity: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Start authentication process
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    
    // Authentication successful
    loginSuccess: (state, action: PayloadAction<{ user: User }>) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.error = null;
      state.lastActivity = new Date().toISOString();
    },
    
    // Authentication failed
    loginFailure: (state, action: PayloadAction<AuthError>) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.error = action.payload;
    },
    
    // Logout user
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      state.loading = false;
      state.lastActivity = null;
    },
    
    // Update user information
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    // Clear authentication error
    clearAuthError: (state) => {
      state.error = null;
    },
    
    // Update last activity timestamp
    updateLastActivity: (state) => {
      state.lastActivity = new Date().toISOString();
    },
    
    // Reset auth state to initial
    resetAuthState: () => initialState,
  },
});

// Export actions
export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  logout, 
  updateUser, 
  clearAuthError, 
  updateLastActivity,
  resetAuthState 
} = authSlice.actions;

// Export selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectLastActivity = (state: { auth: AuthState }) => state.auth.lastActivity;

export default authSlice.reducer;
