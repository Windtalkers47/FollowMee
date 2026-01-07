import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from './store/store';
import { restoreSession, clearAuth } from './store/slices/authSlice';
import LandingPage from './pages/Landing';
import { API_BASE_URL } from './api/config';

// Lazy pages
const LoginPage = React.lazy(() => import('./pages/Login'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const NotFoundPage = () => <div>404 - Page Not Found</div>;

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

const App = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { isAuthenticated, checkingSession } = useAppSelector((state) => ({
    isAuthenticated: state.auth.isAuthenticated,
    checkingSession: state.auth.checkingSession,
  }));

  // Restore session ONCE
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
      } catch {
        dispatch(clearAuth());
      }
    };

    restoreAuthSession();
  }, [dispatch]);

  // ⛔ Gate rendering until session check finishes
  if (checkingSession) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <React.Suspense fallback={<LoadingSpinner />}>
        <Routes location={location}>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

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

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <DashboardPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </React.Suspense>
    </Box>
  );
};

export default App;
