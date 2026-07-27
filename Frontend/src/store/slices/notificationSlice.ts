import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { notificationApi } from '../../api/notification.api';
import type {
  NotificationRecipient,
  UserNotificationSettings,
  UpdateUserNotificationSettingsDto,
} from '../../types/notification.types';
import { webSocketService } from '../../services/websocket.service';

let notificationNewHandler: ((data: NotificationRecipient) => void) | null = null;
let notificationCountHandler: ((data: { count: number }) => void) | null = null;

interface NotificationState {
  notifications: NotificationRecipient[];
  unreadCount: number;
  total: number;
  loading: boolean;
  error: string | null;
  settings: UserNotificationSettings | null;
  settingsLoading: boolean;
  settingsError: string | null;
  dropdownOpen: boolean;
  lastOffset?: number; // Track last offset for pagination (U2-PAGINATION FIX)
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  total: 0,
  loading: false,
  error: null,
  settings: null,
  settingsLoading: false,
  settingsError: null,
  dropdownOpen: false,
  lastOffset: 0,
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: { limit?: number; offset?: number; unreadOnly?: boolean; view?: 'active' | 'archived' } = {}) => {
    const response = await notificationApi.getNotifications(params.limit, params.offset, params.unreadOnly, params.view);
    return response.data ?? { notifications: [], total: 0, unreadCount: 0 };
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    const response = await notificationApi.getUnreadCount();
    return (response.data?.count) ?? 0;
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (recipientId: number) => {
    const response = await notificationApi.markAsRead(recipientId);
    return response.data;
  }
);

export const markAsUnread = createAsyncThunk(
  'notifications/markAsUnread',
  async (recipientId: number) => {
    const response = await notificationApi.markAsUnread(recipientId);
    return response.data;
  }
);

export const markAsSeen = createAsyncThunk(
  'notifications/markAsSeen',
  async (recipientId: number) => {
    const response = await notificationApi.markAsSeen(recipientId);
    return response.data;
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    await notificationApi.markAllAsRead();
  }
);

export const archiveNotification = createAsyncThunk(
  'notifications/archiveNotification',
  async (recipientId: number) => {
    const response = await notificationApi.archiveNotification(recipientId);
    return response.data;
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (recipientId: number) => {
    const response = await notificationApi.deleteNotification(recipientId);
    return response.data;
  }
);

export const fetchSettings = createAsyncThunk(
  'notifications/fetchSettings',
  async () => {
    const response = await notificationApi.getNotificationSettings();
    return response.data;
  }
);

export const updateSettings = createAsyncThunk(
  'notifications/updateSettings',
  async (dto: UpdateUserNotificationSettingsDto) => {
    const response = await notificationApi.updateNotificationSettings(dto);
    return response.data;
  }
);

export const connectWebSocket = createAsyncThunk(
  'notifications/connectWebSocket',
  async (userId: number, { dispatch }) => {
    webSocketService.connect(userId);

    if (notificationNewHandler) webSocketService.offNotificationNew(notificationNewHandler);
    if (notificationCountHandler) webSocketService.offNotificationUnreadCount(notificationCountHandler);

    notificationNewHandler = (data: NotificationRecipient) => {
      dispatch(addNotification(data));
    };
    notificationCountHandler = (data: { count: number }) => {
      dispatch(notificationSlice.actions.setUnreadCount(data.count));
    };
    webSocketService.onNotificationNew(notificationNewHandler);
    webSocketService.onNotificationUnreadCount(notificationCountHandler);
  }
);

export const disconnectWebSocket = createAsyncThunk(
  'notifications/disconnectWebSocket',
  async () => {
    if (notificationNewHandler) webSocketService.offNotificationNew(notificationNewHandler);
    if (notificationCountHandler) webSocketService.offNotificationUnreadCount(notificationCountHandler);
    notificationNewHandler = null;
    notificationCountHandler = null;
    webSocketService.disconnect();
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setDropdownOpen: (state, action: PayloadAction<boolean>) => {
      state.dropdownOpen = action.payload;
    },
    addNotification: (state, action: PayloadAction<NotificationRecipient>) => {
      if (state.notifications.some(item => item.recipientId === action.payload.recipientId)) {
        return;
      }
      state.notifications.unshift(action.payload);
      state.total += 1;
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSettingsError: (state) => {
      state.settingsError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch notifications
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Store the offset from the request
        state.lastOffset = action.meta.arg?.offset || 0;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        const notifications = payload.notifications ?? [];
        const total = payload.total ?? 0;
        const unreadCount = payload.unreadCount ?? 0;
        
        // Check if this is a pagination request by checking the offset argument (U2-PAGINATION FIX)
        const offset = action.meta.arg?.offset;
        const isPagination = offset !== undefined && offset > 0;
        
        if (isPagination) {
          const known = new Set(state.notifications.map(item => item.recipientId));
          state.notifications = [...state.notifications, ...notifications.filter(item => !known.has(item.recipientId))];
        } else {
          // Replace notifications for initial load
          state.notifications = notifications;
        }
        
        state.total = total;
        state.unreadCount = unreadCount;
        state.lastOffset = offset || 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      });

    // Fetch unread count
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action: PayloadAction<number>) => {
        state.unreadCount = action.payload;
      });

    // Mark as read
    builder
      .addCase(markAsRead.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload) return;
        const index = state.notifications.findIndex(
          (n) => n.recipientId === payload.recipientId
        );
        if (index !== -1) {
          const wasUnread = !state.notifications[index].isRead;
          state.notifications[index] = payload;
          if (payload.isRead && wasUnread) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      });

    // Mark as seen
    builder
      .addCase(markAsSeen.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload) return;
        const index = state.notifications.findIndex(
          (n) => n.recipientId === payload.recipientId
        );
        if (index !== -1) {
          const wasUnread = !state.notifications[index].isRead;
          state.notifications.splice(index, 1);
          state.total = Math.max(0, state.total - 1);
          if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });

    builder.addCase(markAsUnread.fulfilled, (state, action) => {
      const payload = action.payload;
      if (!payload) return;
      const index = state.notifications.findIndex(n => n.recipientId === payload.recipientId);
      if (index !== -1) {
        const wasRead = state.notifications[index].isRead;
        state.notifications[index] = payload;
        if (wasRead && !payload.isRead) state.unreadCount += 1;
      }
    });

    // Mark all as read
    builder
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }));
        state.unreadCount = 0;
      });

    // Archive notification
    builder
      .addCase(archiveNotification.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload) return;
        const index = state.notifications.findIndex(
          (n) => n.recipientId === payload.recipientId
        );
        if (index !== -1) {
          state.notifications[index] = payload;
        }
      });

    // Delete notification
    builder
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload) return;
        const index = state.notifications.findIndex(
          (n) => n.recipientId === payload.recipientId
        );
        if (index !== -1) {
          state.notifications.splice(index, 1);
          if (!payload.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.total = Math.max(0, state.total - 1);
        }
      });

    // Fetch settings
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        if (action.payload) {
          state.settings = action.payload;
        }
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.error.message || 'Failed to fetch settings';
      });

    // Update settings
    builder
      .addCase(updateSettings.pending, (state) => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        if (action.payload) {
          state.settings = action.payload;
        }
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.error.message || 'Failed to update settings';
      });
  },
});

export const { setDropdownOpen, addNotification, clearError, clearSettingsError } =
  notificationSlice.actions;

export const selectNotifications = (state: { notifications: NotificationState }) =>
  state.notifications.notifications;
export const selectUnreadCount = (state: { notifications: NotificationState }) =>
  state.notifications.unreadCount;
export const selectTotalCount = (state: { notifications: NotificationState }) =>
  state.notifications.total;
export const selectNotificationLoading = (state: { notifications: NotificationState }) =>
  state.notifications.loading;
export const selectNotificationError = (state: { notifications: NotificationState }) =>
  state.notifications.error;
export const selectDropdownOpen = (state: { notifications: NotificationState }) =>
  state.notifications.dropdownOpen;
export const selectSettings = (state: { notifications: NotificationState }) =>
  state.notifications.settings;
export const selectSettingsLoading = (state: { notifications: NotificationState }) =>
  state.notifications.settingsLoading;
export const selectSettingsError = (state: { notifications: NotificationState }) =>
  state.notifications.settingsError;

export default notificationSlice.reducer;
