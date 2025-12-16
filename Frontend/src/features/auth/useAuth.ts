import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginSuccess, logout as logoutAction } from './authSlice';
import api from '@/services/api';

const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await api.post('/auth/login', { email, password });
        const { user, token } = response.data;
        
        dispatch(loginSuccess({ user, token }));
        navigate('/dashboard');
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          message: error.response?.data?.message || 'Login failed' 
        };
      }
    },
    [dispatch, navigate]
  );

  const logout = useCallback(() => {
    dispatch(logoutAction());
    navigate('/login');
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
