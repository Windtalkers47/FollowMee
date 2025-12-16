import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginStart, loginSuccess, loginFailure, logout as logoutAction } from './authSlice';
import api from '../../services/api';

const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.auth);

  // Check if user is authenticated on initial load
  const checkAuth = useCallback(async () => {
    dispatch(loginStart());
    try {
      const response = await api.get('/auth/me');
      dispatch(loginSuccess({ user: response.data.user }));
    } catch (error) {
      dispatch(loginFailure('Not authenticated'));
    }
  }, [dispatch]);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        dispatch(loginStart());
        const response = await api.post('/auth/login', { email, password });
        const { user } = response.data;
        
        dispatch(loginSuccess({ user }));
        navigate('/dashboard');
        return { success: true };
      } catch (error: any) {
        const message = error.response?.data?.message || 'Login failed';
        dispatch(loginFailure(message));
        return { 
          success: false, 
          message
        };
      }
    },
    [dispatch, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(logoutAction());
      navigate('/login');
    }
  }, [dispatch, navigate]);

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  };
};

export default useAuth;
