import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from './store/store';
import { restoreSession, clearAuth } from './store/slices/authSlice';
import MainLayout from './layouts/MainLayout';
import { API_BASE_URL } from './api/config';
import { NotificationProvider } from './contexts/Notification';

// Lazy load pages
const LandingPage = React.lazy(() => import('./pages/Landing'));
const LoginPage = React.lazy(() => import('./pages/Login'));
const RegisterPage = React.lazy(() => import('./pages/Register'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPassword'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const AnalyticsPage = React.lazy(() => import('./pages/Analytics'));
const PostsPage = React.lazy(() => import('./pages/Posts'));
const SchedulePage = React.lazy(() => import('./pages/Schedule'));
const AudiencePage = React.lazy(() => import('./pages/Audience'));
const CustomerPage = React.lazy(() => import('./pages/Customer'));
const CustomerProfilePage = React.lazy(() => import('./pages/CustomerProfile/CustomerProfilePage'));
const UsersPage = React.lazy(() => import('./pages/UsersManagement'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));

const LoadingSpinner = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
);

const ProtectedRoute = () => {
  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
};

const App = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { checkingSession, isAuthenticated } = useAppSelector((state) => ({
    checkingSession: state.auth.checkingSession,
    isAuthenticated: state.auth.isAuthenticated,
  }));

  /* Restore session once */
  useEffect(() => {
    const restoreAuthSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
        });

        if (!response.ok) {
          dispatch(clearAuth());
          return;
        }

        const data = await response.json();

        if (data?.data) {
          dispatch(
            restoreSession({
              user: data.data,
              accessToken: '',
              refreshToken: '',
              expiresIn: 3600,
            })
          );
        } else {
          dispatch(clearAuth());
        }
      } catch (error) {
        console.error('Restore session error:', error);
        dispatch(clearAuth());
      }
    };

    restoreAuthSession();
  }, [dispatch]);

  if (checkingSession) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes liquid {
            0%, 100% { border-radius: 4px; }
            50% { border-radius: 6px; }
          }
          @keyframes glow {
            0%, 100% { 
              box-shadow: 0 0 20px rgba(100, 181, 246, 0.3);
            }
            50% { 
              box-shadow: 0 0 30px rgba(100, 181, 246, 0.5);
            }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
          * {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
        `}
      </style>
      <NotificationProvider>
        <Box sx={{ minHeight: '100vh' }}>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes location={location}>
          {/* Public */}
          <Route index element={<LandingPage />} />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <RegisterPage />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <ForgotPasswordPage />
              )
            }
          />
          
          {/* Reset password route should be accessible without authentication */}
          <Route 
            path="/reset-password" 
            element={<ResetPasswordPage />}
          />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/audience" element={<AudiencePage />} />
            <Route path="/customer" element={<CustomerPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/customer-profile" element={<CustomerProfilePage />} />
            <Route path="/customer/:customerId/profile" element={<CustomerProfilePage />} />
          </Route>

          {/* Public profile routes */}
          <Route path="/customer-profile/:customerId" element={<CustomerProfilePage />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Suspense>
    </Box>
    </NotificationProvider>
    </>
  );
};

export default App;
