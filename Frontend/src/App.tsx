import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet, useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from './store/store';
import { restoreSession, clearAuth, updateUser } from './store/slices/authSlice';
import { connectWebSocket, disconnectWebSocket, fetchNotifications, fetchUnreadCount } from './store/slices/notificationSlice';
import { API_BASE_URL } from './api/config';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { AsyncErrorBoundary } from './components/ErrorBoundary/AsyncErrorBoundary';
import { webSocketService } from './services/websocket.service';
import { useQueryClient } from '@tanstack/react-query';
import type { UserProfileUpdatedEvent } from './types/profile-event.types';
import { patchUserInCache } from './utils/patchUserInCache';

// Lazy load pages
const LoginPage = React.lazy(() => import('./pages/Login'));
const RegisterPage = React.lazy(() => import('./pages/Register'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPassword'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const PostsPage = React.lazy(() => import('./pages/Posts'));
const MyWorkPage = React.lazy(() => import('./pages/MyWork'));
const TaskDetailPage = React.lazy(() => import('./pages/TaskDetail'));
const SchedulePageWithSelection = React.lazy(() => import('./pages/Schedule'));
const CustomerPage = React.lazy(() => import('./pages/Customer'));
const ProfileLibraryPage = React.lazy(() => import('./pages/CustomerProfile/ProfileLibraryPage'));
const ProfileEditorPage = React.lazy(() => import('./pages/CustomerProfile/ProfileEditorPage'));
const PublicProfilePage = React.lazy(() => import('./pages/CustomerProfile/PublicProfilePage'));
const UsersPage = React.lazy(() => import('./pages/UsersManagement'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const NotificationAnalytics = React.lazy(() => import('./pages/NotificationAnalytics'));
const NotificationsPage = React.lazy(() => import('./pages/Notifications'));
const RewardsPage = React.lazy(() => import('./pages/Rewards'));
const MainLayout = React.lazy(() => import('./layouts/MainLayout'));

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

const LegacyTaskRedirect = () => {
  const { taskId } = useParams();
  return <Navigate to={taskId ? `/tasks/${taskId}` : '/posts'} replace />;
};

const ProtectedRoute = () => {
  const isAuthenticated = useAppSelector(
    (state) => state.auth.isAuthenticated
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </Suspense>
  );
};

const App = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const checkingSession = useAppSelector((state) => state.auth.checkingSession);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const currentUser = useAppSelector((state) => state.auth.user);
  const landingPath = currentUser?.roles?.some((role) => ['Admin', 'Owner', 'Superadmin'].includes(role)) ? '/dashboard' : '/my-work';

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
    const revisions = new Map<number, string>();
    const handleProfileUpdate = (data: UserProfileUpdatedEvent) => {
      const latest = revisions.get(data.userId);
      if (latest && latest >= data.updatedAt) return;
      revisions.set(data.userId, data.updatedAt);

      queryClient.setQueriesData({}, cached => patchUserInCache(cached, data));
      if (data.userId === currentUser.userId) {
        dispatch(updateUser({
          ...currentUser,
          userName: data.userName,
          userLastName: data.userLastName,
          userImageUrl: data.userImageUrl,
        }));
      }
      window.dispatchEvent(new CustomEvent('followmee:profile-updated', { detail: data }));
    };

    webSocketService.onProfileUpdated(handleProfileUpdate);

    // Cleanup on unmount
    return () => {
      webSocketService.offProfileUpdated(handleProfileUpdate);
    };
  }, [dispatch, isAuthenticated, currentUser, queryClient]);

  /* Keep task, activity and comment data synchronized across pages and browsers. */
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.userId) return;

    const taskHandler = (data: { taskId?: string; status?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (data?.taskId) queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
      if (data?.status === 'done') {
        queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['top-performers'] });
        queryClient.invalidateQueries({ queryKey: ['user-rank'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    };
    const commentHandler = (data: { taskId?: string }) => {
      if (data?.taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] });
      }
      taskHandler(data);
    };
    const reactionHandler = (data: { taskId?: string }) => {
      commentHandler(data);
      window.dispatchEvent(new CustomEvent('followmee:reaction-updated', { detail: data }));
    };
    const rewardHandler = () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };
    const ownerHandler = async () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        const payload = await response.json();
        if (response.ok && payload?.data) dispatch(updateUser(payload.data));
      } catch (error) {
        console.error('Unable to refresh role after ownership transfer', error);
      }
    };

    const taskEvents = ['task:created', 'task:updated', 'task:deleted'];
    const commentEvents = ['comment:created', 'comment:updated', 'comment:deleted'];
    taskEvents.forEach(event => webSocketService.onDomainEvent(event, taskHandler));
    webSocketService.onDomainEvent('activity:created', taskHandler);
    commentEvents.forEach(event => webSocketService.onDomainEvent(event, commentHandler));
    webSocketService.onDomainEvent('reaction:updated', reactionHandler);
    ['reward:points-updated', 'reward:mission-progress', 'reward:redemption-updated', 'reward:season-updated']
      .forEach(event => webSocketService.onDomainEvent(event, rewardHandler));
    webSocketService.onDomainEvent('owner:transferred', ownerHandler);

    return () => {
      taskEvents.forEach(event => webSocketService.offDomainEvent(event, taskHandler));
      webSocketService.offDomainEvent('activity:created', taskHandler);
      commentEvents.forEach(event => webSocketService.offDomainEvent(event, commentHandler));
      webSocketService.offDomainEvent('reaction:updated', reactionHandler);
      ['reward:points-updated', 'reward:mission-progress', 'reward:redemption-updated', 'reward:season-updated']
        .forEach(event => webSocketService.offDomainEvent(event, rewardHandler));
      webSocketService.offDomainEvent('owner:transferred', ownerHandler);
    };
  }, [dispatch, isAuthenticated, currentUser?.userId, queryClient]);

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
                      <Navigate to={landingPath} replace />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                <Route
                  path="/login"
                  element={
                    isAuthenticated ? (
                      <Navigate to={landingPath} replace />
                    ) : (
                      <LoginPage />
                    )
                  }
                />
                <Route
                  path="/register"
                  element={
                    isAuthenticated ? (
                      <Navigate to={landingPath} replace />
                    ) : (
                      <RegisterPage />
                    )
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    isAuthenticated ? (
                      <Navigate to={landingPath} replace />
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
                  <Route path="/my-work" element={<MyWorkPage />} />
                  <Route path="/posts" element={<PostsPage />} />
                  <Route path="/posts/:taskId" element={<LegacyTaskRedirect />} />
                  <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
                  <Route path="/schedule" element={<SchedulePageWithSelection />} />
                  <Route path="/customer" element={<CustomerPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/customer-profile" element={<ProfileLibraryPage />} />
                  <Route path="/customer-profile/:profileId/edit" element={<ProfileEditorPage />} />
                  <Route path="/customer/:customerId/profile" element={<Navigate to="/customer-profile" replace />} />
                  <Route path="/notification-analytics" element={<NotificationAnalytics />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/rewards" element={<RewardsPage />} />
                </Route>

                {/* Legacy customer links never expose CRM data. */}
                <Route path="/customer-profile/:customerId" element={<Navigate to="/customer-profile" replace />} />

                {/* 404 */}
                <Route
                  path="*"
                  element={
                    isAuthenticated ? (
                      <Navigate to={landingPath} replace />
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
