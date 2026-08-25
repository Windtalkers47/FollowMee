import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet, useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from './store/store';
import { restoreSession, clearAuth, updateUser } from './store/slices/authSlice';
import { connectWebSocket, disconnectWebSocket, fetchNotifications, fetchUnreadCount } from './store/slices/notificationSlice';
import NotificationRealtimeBridge from './components/NotificationRealtimeBridge';
import { API_BASE_URL } from './api/config';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { AsyncErrorBoundary } from './components/ErrorBoundary/AsyncErrorBoundary';
import { webSocketService } from './services/websocket.service';
import {
  applyRealtimeEventToCache,
  isNewerRealtimeEvent,
  realtimeEventKey,
  realtimeRevisionOf,
  splitRealtimeEventByEntity,
  type RealtimeDomainEvent,
  type RealtimeEventData,
  type RealtimeRevision,
} from './utils/realtimeCache';
import { useQueryClient } from '@tanstack/react-query';
import type { UserProfileUpdatedEvent } from './types/profile-event.types';
import { patchUserInCache } from './utils/patchUserInCache';
import { primaryRouteLoaders } from './utils/routePrefetch';
import CookieConsentBanner from './components/CookieConsentBanner';
import CapacityCriticalBanner from './components/CapacityCriticalBanner';

// Lazy load pages
const LoginPage = React.lazy(() => import('./pages/Login'));
const RegisterPage = React.lazy(() => import('./pages/Register'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPassword'));
const DashboardPage = React.lazy(primaryRouteLoaders['/dashboard']);
const PostsPage = React.lazy(() => import('./pages/Posts'));
const MyWorkPage = React.lazy(primaryRouteLoaders['/my-work']);
const TaskDetailPage = React.lazy(() => import('./pages/TaskDetail'));
const SchedulePageWithSelection = React.lazy(primaryRouteLoaders['/schedule']);
const CustomerPage = React.lazy(primaryRouteLoaders['/customer']);
const ProfileLibraryPage = React.lazy(() => import('./pages/CustomerProfile/ProfileLibraryPage'));
const ProfileEditorPage = React.lazy(() => import('./pages/CustomerProfile/ProfileEditorPage'));
const PublicProfilePage = React.lazy(() => import('./pages/CustomerProfile/PublicProfilePage'));
const LandingPage = React.lazy(() => import('./pages/Landing'));
const DemoProfilePage = React.lazy(() => import('./pages/CustomerProfile/DemoProfilePage'));
const QuickCreatePage = React.lazy(() => import('./pages/CustomerProfile/QuickCreatePage'));
const LeadInboxPage = React.lazy(() => import('./pages/CustomerProfile/LeadInboxPage'));
const UsersPage = React.lazy(() => import('./pages/UsersManagement'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const AnalyticsPage = React.lazy(() => import('./pages/Analytics'));
const NotificationsPage = React.lazy(() => import('./pages/Notifications'));
const RewardsPage = React.lazy(() => import('./pages/Rewards'));
const UserProfilePage = React.lazy(() => import('./pages/UserProfile'));
const PublicUserProfilePage = React.lazy(() => import('./pages/UserProfile/PublicUserProfilePage'));
const MainLayout = React.lazy(() => import('./layouts/MainLayout'));
const LegalPage = React.lazy(() => import('./pages/Legal/LegalPage'));
const PrivacyRequestPage = React.lazy(() => import('./pages/Legal/PrivacyRequestPage'));
const VerifyPrivacyRequestPage = React.lazy(() => import('./pages/Legal/VerifyPrivacyRequestPage'));
const VerifyRegistrationPage = React.lazy(() => import('./pages/VerifyRegistration'));
const RegistrationRequestsPage = React.lazy(() => import('./pages/RegistrationRequests'));
const SystemCapacityPage = React.lazy(() => import('./pages/SystemCapacity'));
const PrivacyRequestsPage = React.lazy(() => import('./pages/PrivacyRequests'));

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
    <><NotificationRealtimeBridge /><CapacityCriticalBanner />
    <Suspense fallback={<LoadingSpinner />}>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </Suspense>
    </>
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

    const pendingEvents = new Map<string, RealtimeDomainEvent>();
    const latestRevisions = new Map<string, RealtimeRevision>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const queueEvent = (name: RealtimeDomainEvent['name'], data: RealtimeEventData = {}) => {
      const event = { name, data } as RealtimeDomainEvent;
      splitRealtimeEventByEntity(event).forEach(entityEvent => {
        const eventKey = realtimeEventKey(entityEvent);
        if (!isNewerRealtimeEvent(latestRevisions.get(eventKey), entityEvent)) return;
        const revision = realtimeRevisionOf(entityEvent);
        if (revision !== undefined) latestRevisions.set(eventKey, revision);
        pendingEvents.set(eventKey, entityEvent);
      });
      if (!pendingEvents.size) return;
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        const fallbackKeys = new Map<string, ReadonlyArray<unknown>>();
        pendingEvents.forEach(pendingEvent => {
          applyRealtimeEventToCache(queryClient, pendingEvent, currentUser.userId)
            .forEach(queryKey => fallbackKeys.set(JSON.stringify(queryKey), queryKey));
        });
        pendingEvents.clear();
        fallbackKeys.forEach(queryKey => { void queryClient.invalidateQueries({ queryKey }); });
        flushTimer = null;
      }, 80);
    };
    const ownerHandler = async () => {
      queueEvent('owner:transferred');
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        const payload = await response.json();
        if (response.ok && payload?.data) dispatch(updateUser(payload.data));
      } catch (error) {
        console.error('Unable to refresh role after ownership transfer', error);
      }
    };

    const domainEvents: RealtimeDomainEvent['name'][] = [
      'task:created', 'task:updated', 'task:deleted', 'activity:created',
      'comment:created', 'comment:updated', 'comment:deleted', 'reaction:updated',
      'reward:points-updated', 'reward:mission-progress', 'reward:redemption-updated', 'reward:season-updated',
    ];
    const handlers = new Map<RealtimeDomainEvent['name'], (data: RealtimeEventData) => void>();
    domainEvents.forEach(event => {
      const handler = (data: RealtimeEventData) => {
        queueEvent(event, data);
        if (event === 'reaction:updated') window.dispatchEvent(new CustomEvent('followmee:reaction-updated', { detail: data }));
      };
      handlers.set(event, handler);
      webSocketService.onDomainEvent(event, handler);
    });
    webSocketService.onDomainEvent('owner:transferred', ownerHandler);

    return () => {
      handlers.forEach((handler, event) => webSocketService.offDomainEvent(event, handler));
      webSocketService.offDomainEvent('owner:transferred', ownerHandler);
      if (flushTimer) clearTimeout(flushTimer);
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
          <CookieConsentBanner />
          <Suspense fallback={<LoadingSpinner />}>
            <ErrorBoundary>
              <Routes location={location}>
                {/* Public */}
                <Route index element={<LandingPage />} />
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
                <Route path="/demo/profile" element={<DemoProfilePage />} />
                <Route path="/u/:handle" element={<PublicUserProfilePage />} />
                <Route path="/privacy" element={<LegalPage />} />
                <Route path="/terms" element={<LegalPage />} />
                <Route path="/privacy/request" element={<PrivacyRequestPage />} />
                <Route path="/privacy/request/verify" element={<VerifyPrivacyRequestPage />} />
                <Route path="/verify-registration" element={<VerifyRegistrationPage />} />

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
                  <Route path="/users/registration-requests" element={<RegistrationRequestsPage />} />
                  <Route path="/system-capacity" element={<SystemCapacityPage />} />
                  <Route path="/privacy-requests" element={<PrivacyRequestsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/customer-profile" element={<ProfileLibraryPage />} />
                  <Route path="/customer-profile/new" element={<QuickCreatePage />} />
                  <Route path="/customer-profile/leads" element={<LeadInboxPage />} />
                  <Route path="/customer-profile/:profileId/edit" element={<ProfileEditorPage />} />
                  <Route path="/customer/:customerId/profile" element={<Navigate to="/customer-profile" replace />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/notification-analytics" element={<Navigate to="/analytics?tab=notifications" replace />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/rewards" element={<RewardsPage />} />
                  <Route path="/profile" element={<UserProfilePage />} />
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
