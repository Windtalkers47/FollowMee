import React, { useEffect } from 'react';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from './store/store';
import LandingPage from './pages/Landing';

// Lazy load other pages
const LoginPage = React.lazy(() => import('./pages/Login'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const NotFoundPage = () => <div>404 - Page Not Found</div>;

const LoadingSpinner = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

const App = () => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAppSelector((state) => ({
    isAuthenticated: state.auth.isAuthenticated,
    loading: state.auth.loading,
  }));

  // Check for existing session on initial load
  useEffect(() => {
    // Add session check logic here (will be implemented with cookies)
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <React.Suspense fallback={<LoadingSpinner />}>
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                <DashboardPage />
              ) : (
                <Navigate to="/login" state={{ from: location }} replace />
              )
            } 
          />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </React.Suspense>
    </Box>
  );
}

export default App;
