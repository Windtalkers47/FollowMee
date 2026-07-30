import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from './store/store';
import { restoreSession, clearAuth } from './store/slices/authSlice';
import { connectWebSocket, disconnectWebSocket, fetchNotifications, fetchUnreadCount } from './store/slices/notificationSlice';
import MainLayout from './layouts/MainLayout';
import { API_BASE_URL } from './api/config';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { AsyncErrorBoundary } from './components/ErrorBoundary/AsyncErrorBoundary';
import { webSocketService } from './services/websocket.service';
import { useQueryClient } from '@tanstack/react-query';

// Lazy load pages
const LoginPage = React.lazy(() => import('./pages/Login'));
const RegisterPage = React.lazy(() => import('./pages/Register'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPassword'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const PostsPage = React.lazy(() => import('./pages/Posts'));
const SchedulePageWithSelection = React.lazy(() => import('./pages/Schedule'));
const CustomerPage = React.lazy(() => import('./pages/Customer'));
const ProfileLibraryPage = React.lazy(() => import('./pages/CustomerProfile/ProfileLibraryPage'));
const ProfileEditorPage = React.lazy(() => import('./pages/CustomerProfile/ProfileEditorPage'));
const PublicProfilePage = React.lazy(() => import('./pages/CustomerProfile/PublicProfilePage'));
const UsersPage = React.lazy(() => import('./pages/UsersManagement'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const NotificationAnalytics = React.lazy(() => import('./pages/NotificationAnalytics'));
const NotificationsPage = React.lazy(() => import('./pages/Notifications'));

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
  const queryClient = useQueryClient();

  const checkingSession = useAppSelector((state) => state.auth.checkingSession);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const currentUser = useAppSelector((state) => state.auth.user);

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

  /* Connect/disconnect WebSocket based on auth state */
  useEffect(() => {
    if (checkingSession) return;

    if (isAuthenticated && currentUser?.userId) {
      dispatch(connectWebSocket(currentUser.userId));
    } else {
      dispatch(disconnectWebSocket());
    }
  }, [checkingSession, isAuthenticated, currentUser?.userId, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const reconcileNotifications = () => {
      dispatch(fetchUnreadCount());
      dispatch(fetchNotifications({ limit: 8 }));
    };
    window.addEventListener('focus', reconcileNotifications);
    window.addEventListener('online', reconcileNotifications);
    return () => {
      window.removeEventListener('focus', reconcileNotifications);
      window.removeEventListener('online', reconcileNotifications);
    };
  }, [isAuthenticated, dispatch]);

  /* Global WebSocket profile update listener - broadcast to all components via window event */
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.userId) return;

    // Connect WebSocket for profile updates
    webSocketService.connect(currentUser.userId);

    // Register global listener
    const handleProfileUpdate = (data: { userId: number; userImageUrl?: string | null }) => {
      window.dispatchEvent(new CustomEvent('followmee:profile-updated', { detail: data }));
    };

    webSocketService.onProfileUpdated(handleProfileUpdate);

    // Cleanup on unmount
    return () => {
      webSocketService.offProfileUpdated(handleProfileUpdate);
    };
  }, [isAuthenticated, currentUser?.userId]);

  /* Keep task, activity and comment data synchronized across pages and browsers. */
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.userId) return;

    const taskHandler = () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['top-performers'] });
      queryClient.invalidateQueries({ queryKey: ['user-rank'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };
    const commentHandler = (data: { taskId?: string }) => {
      if (data?.taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] });
      }
      taskHandler();
    };
    const reactionHandler = (data: { taskId?: string }) => {
      commentHandler(data);
      window.dispatchEvent(new CustomEvent('followmee:reaction-updated', { detail: data }));
    };

    const taskEvents = ['task:created', 'task:updated', 'task:deleted'];
    const commentEvents = ['comment:created', 'comment:updated', 'comment:deleted'];
    taskEvents.forEach(event => webSocketService.onDomainEvent(event, taskHandler));
    commentEvents.forEach(event => webSocketService.onDomainEvent(event, commentHandler));
    webSocketService.onDomainEvent('reaction:updated', reactionHandler);

    return () => {
      taskEvents.forEach(event => webSocketService.offDomainEvent(event, taskHandler));
      commentEvents.forEach(event => webSocketService.offDomainEvent(event, commentHandler));
      webSocketService.offDomainEvent('reaction:updated', reactionHandler);
    };
  }, [isAuthenticated, currentUser?.userId, queryClient]);

  if (checkingSession) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App ErrorBoundary caught:', error, errorInfo);
        // Optionally log to error reporting service
      }}
    >
      <AsyncErrorBoundary
        maxRetries={3}
        onError={(error) => {
          console.error('App AsyncErrorBoundary caught:', error);
        }}
      >
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
          `}
        </style>
        <Box sx={{ minHeight: '100vh' }}>
          <Suspense fallback={<LoadingSpinner />}>
            <ErrorBoundary>
              <Routes location={location}>
                {/* Public */}
                <Route
                  index
                  element={
                    isAuthenticated ? (
                      <Navigate to="/dashboard" replace />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
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
                <Route path="/p/:slug" element={<PublicProfilePage />} />

                {/* Protected */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/posts" element={<PostsPage />} />
                  <Route path="/posts/:taskId" element={<PostsPage />} />
                  <Route path="/schedule" element={<SchedulePageWithSelection />} />
                  <Route path="/customer" element={<CustomerPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/customer-profile" element={<ProfileLibraryPage />} />
                  <Route path="/customer-profile/:profileId/edit" element={<ProfileEditorPage />} />
                  <Route path="/customer/:customerId/profile" element={<Navigate to="/customer-profile" replace />} />
                  <Route path="/notification-analytics" element={<NotificationAnalytics />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                </Route>

                {/* Legacy customer links never expose CRM data. */}
                <Route path="/customer-profile/:customerId" element={<Navigate to="/customer-profile" replace />} />

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
            </ErrorBoundary>
          </Suspense>
        </Box>
      </AsyncErrorBoundary>
    </ErrorBoundary>
  );
};

export default App;
