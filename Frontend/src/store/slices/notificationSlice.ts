import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { notificationApi } from '../../api/notification.api';
import {
  NotificationRecipient,
  NotificationListResponse,
  UserNotificationSettings,
  UpdateUserNotificationSettingsDto,
} from '../../types/notification.types';
import { webSocketService } from '../../services/websocket.service';

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
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
    return await notificationApi.getNotifications(params);
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    const result = await notificationApi.getUnreadCount();
    return result.count;
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (recipientId: number) => {
    return await notificationApi.markAsRead(recipientId);
  }
);

export const markAsSeen = createAsyncThunk(
  'notifications/markAsSeen',
  async (recipientId: number) => {
    return await notificationApi.markAsSeen(recipientId);
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
    return await notificationApi.archiveNotification(recipientId);
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (recipientId: number) => {
    return await notificationApi.deleteNotification(recipientId);
  }
);

export const fetchSettings = createAsyncThunk(
  'notifications/fetchSettings',
  async () => {
    return await notificationApi.getSettings();
  }
);

export const updateSettings = createAsyncThunk(
  'notifications/updateSettings',
  async (dto: UpdateUserNotificationSettingsDto) => {
    return await notificationApi.updateSettings(dto);
  }
);

export const connectWebSocket = createAsyncThunk(
  'notifications/connectWebSocket',
  async (userId: number, { dispatch }) => {
    webSocketService.connect(userId);

    // Listen for new notifications
    webSocketService.onNotificationNew((data) => {
      dispatch(addNotification(data));
    });

    // Listen for unread count updates
    webSocketService.onNotificationUnreadCount((data) => {
      dispatch(notificationSlice.actions.setUnreadCount(data.count));
    });
  }
);

export const disconnectWebSocket = createAsyncThunk(
  'notifications/disconnectWebSocket',
  async () => {
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
      state.notifications.unshift(action.payload);
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
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<NotificationListResponse>) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.total = action.payload.total;
        state.unreadCount = action.payload.unreadCount;
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
      .addCase(markAsRead.fulfilled, (state, action: PayloadAction<NotificationRecipient>) => {
        const index = state.notifications.findIndex(
          (n) => n.recipientId === action.payload.recipientId
        );
        if (index !== -1) {
          state.notifications[index] = action.payload;
          if (action.payload.isRead && !state.notifications[index].isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      });

    // Mark as seen
    builder
      .addCase(markAsSeen.fulfilled, (state, action: PayloadAction<NotificationRecipient>) => {
        const index = state.notifications.findIndex(
          (n) => n.recipientId === action.payload.recipientId
        );
        if (index !== -1) {
          state.notifications[index] = action.payload;
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
      .addCase(archiveNotification.fulfilled, (state, action: PayloadAction<NotificationRecipient>) => {
        const index = state.notifications.findIndex(
          (n) => n.recipientId === action.payload.recipientId
        );
        if (index !== -1) {
          state.notifications[index] = action.payload;
        }
      });

    // Delete notification
    builder
      .addCase(deleteNotification.fulfilled, (state, action: PayloadAction<NotificationRecipient>) => {
        const index = state.notifications.findIndex(
          (n) => n.recipientId === action.payload.recipientId
        );
        if (index !== -1) {
          state.notifications.splice(index, 1);
          if (!action.payload.isRead) {
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
      .addCase(fetchSettings.fulfilled, (state, action: PayloadAction<UserNotificationSettings>) => {
        state.settingsLoading = false;
        state.settings = action.payload;
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
      .addCase(updateSettings.fulfilled, (state, action: PayloadAction<UserNotificationSettings>) => {
        state.settingsLoading = false;
        state.settings = action.payload;
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
