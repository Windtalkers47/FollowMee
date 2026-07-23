import { apiConfig, handleResponse } from './config';
import { NotificationRecipient, UserNotificationSettings } from '../types/notification.types';

/**
 * Response types
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface NotificationsResponse {
  notifications: NotificationRecipient[];
  totalCount: number;
}

interface NotificationListData {
  notifications: NotificationRecipient[];
  total: number;
  unreadCount: number;
}

interface NotificationCountResponse {
  count: number;
}

/**
 * Track open event
 * Called when user views a notification
 */
export const trackOpen = async (recipientId: number, notificationId: number): Promise<void> => {
  try {
    await fetch(`${apiConfig.baseURL}/notifications/track/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      credentials: 'include',
      body: JSON.stringify({ recipientId, notificationId }),
    });
  } catch (error) {
    console.error('Failed to track open event:', error);
    // Don't throw - tracking failure shouldn't affect user experience
  }
};

/**
 * Track click event
 * Called when user clicks on notification actionUrl
 */
export const trackClick = async (recipientId: number, notificationId: number): Promise<void> => {
  try {
    await fetch(`${apiConfig.baseURL}/notifications/track/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      },
      credentials: 'include',
      body: JSON.stringify({ recipientId, notificationId }),
    });
  } catch (error) {
    console.error('Failed to track click event:', error);
    // Don't throw - tracking failure shouldn't affect user experience
  }
};

/**
 * Get notifications for current user
 * Returns normalized data for Redux consumption
 */
export const getNotifications = async (
  limit: number = 20,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<ApiResponse<NotificationListData>> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    unreadOnly: unreadOnly.toString(),
  });

  const response = await fetch(`${apiConfig.baseURL}/notifications?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  const result = await handleResponse<ApiResponse<NotificationsResponse>>(response);
  // Transform backend response to frontend format
  if (result.data) {
    return {
      success: result.success,
      data: {
        notifications: result.data.notifications,
        total: result.data.totalCount,
        unreadCount: result.data.totalCount, // Backend doesn't provide separate unreadCount
      },
    } as ApiResponse<NotificationListData>;
  }
  return { success: result.success } as ApiResponse<NotificationListData>;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<ApiResponse<NotificationCountResponse>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/unread-count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<NotificationCountResponse>>(response);
};

/**
 * Mark notification as read
 * Returns the updated recipient for Redux state update
 */
export const markAsRead = async (recipientId: number): Promise<ApiResponse<NotificationRecipient>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/${recipientId}/read`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<NotificationRecipient>>(response);
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<ApiResponse<void>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/mark-all-read`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<void>>(response);
};

/**
 * Archive notification
 * Returns the updated recipient for Redux state update
 */
export const archiveNotification = async (recipientId: number): Promise<ApiResponse<NotificationRecipient>> => {
  // Backend may not have archive endpoint yet, using read as fallback
  const response = await fetch(`${apiConfig.baseURL}/notifications/${recipientId}/read`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<NotificationRecipient>>(response);
};

/**
 * Delete notification
 * Returns the deleted recipient for Redux state update
 */
export const deleteNotification = async (recipientId: number): Promise<ApiResponse<NotificationRecipient>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/${recipientId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<NotificationRecipient>>(response);
};

/**
 * Get user notification settings
 * Returns settings with default fallback
 */
export const getNotificationSettings = async (): Promise<ApiResponse<UserNotificationSettings>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/settings`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<UserNotificationSettings>>(response);
};

/**
 * Update user notification settings
 * Returns updated settings
 */
export const updateNotificationSettings = async (
  settings: Partial<UserNotificationSettings>
): Promise<ApiResponse<UserNotificationSettings>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
    body: JSON.stringify(settings),
  });

  return handleResponse<ApiResponse<UserNotificationSettings>>(response);
};

/**
 * Get dashboard metrics (admin only)
 */
export const getDashboardMetrics = async (
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<any>> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(`${apiConfig.baseURL}/notifications/analytics/dashboard?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<any>>(response);
};

/**
 * Get quick summary stats (lightweight, cacheable)
 */
export const getQuickSummary = async (): Promise<ApiResponse<any>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/analytics/quick-summary`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<any>>(response);
};

/**
 * Mark notification as seen
 */
export const markAsSeen = async (recipientId: number): Promise<ApiResponse<NotificationRecipient>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/${recipientId}/seen`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<NotificationRecipient>>(response);
};

/**
 * Get analytics summary for current user
 */
export const getAnalyticsSummary = async (days: number = 30): Promise<ApiResponse<any>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/analytics/summary?days=${days}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<any>>(response);
};

/**
 * Push Notification API
 */

/**
 * Get VAPID public key for subscription
 */
export const getVapidPublicKey = async (): Promise<ApiResponse<{ publicKey: string }>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/push/vapid-key`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<{ publicKey: string }>>(response);
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async (
  subscription: {
    endpoint: string;
    expirationTime?: string | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  deviceName?: string
): Promise<ApiResponse<{ subscriptionId: number }>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
    body: JSON.stringify({ subscription, deviceName }),
  });

  return handleResponse<ApiResponse<{ subscriptionId: number }>>(response);
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (endpoint?: string): Promise<ApiResponse<void>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/push/unsubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
    body: JSON.stringify({ endpoint }),
  });

  return handleResponse<ApiResponse<void>>(response);
};

/**
 * Check if push is available
 */
export const checkPushAvailability = async (): Promise<ApiResponse<{ available: boolean; configured: boolean }>> => {
  const response = await fetch(`${apiConfig.baseURL}/notifications/push/available`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...apiConfig.headers,
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<{ available: boolean; configured: boolean }>>(response);
};

/**
 * Get notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  return Notification.permission;
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
};

/**
 * Notification API object (for notificationSlice compatibility)
 */
export const notificationApi = {
  trackOpen,
  trackClick,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsSeen,
  markAllAsRead,
  deleteNotification,
  archiveNotification,
  getNotificationSettings,
  updateNotificationSettings,
  getAnalyticsSummary,
  getDashboardMetrics,
  getQuickSummary,
  // Push notification methods
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  checkPushAvailability,
  getNotificationPermission,
  requestNotificationPermission,
};
