import axios from 'axios';
import { API_BASE_URL } from './config';

export interface NotificationActor {
  userId: number;
  userName: string;
  userLastName: string;
  userImageUrl?: string;
}

export interface Notification {
  notificationId: number;
  notificationType: string;
  actorUserId?: number;
  actorUser?: NotificationActor;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  actionUrl?: string;
  imageUrl?: string;
  isSystem: boolean;
  isGlobal: boolean;
  createdAt: string;
}

export interface NotificationRecipient {
  recipientId: number;
  notificationId: number;
  userId: number;
  notification: Notification;
  isRead: boolean;
  readAt?: string;
  isSeen: boolean;
  seenAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deliveredAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationRecipient[];
  total: number;
  unreadCount: number;
}

export interface UserNotificationSettings {
  settingId: number;
  userId: number;
  notifyTaskAssigned: boolean;
  notifyTaskComment: boolean;
  notifyTaskLike: boolean;
  notifyCommentReply: boolean;
  notifyCommentReaction: boolean;
  notifySystemAlert: boolean;
  notifyRoleChanged: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDto {
  notificationType: string;
  actorUserId?: number;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  actionUrl?: string;
  imageUrl?: string;
  isSystem?: boolean;
  isGlobal?: boolean;
  recipientUserIds?: number[];
  groupActorUserIds?: number[];
}

export interface UpdateUserNotificationSettingsDto {
  notifyTaskAssigned?: boolean;
  notifyTaskComment?: boolean;
  notifyTaskLike?: boolean;
  notifyCommentReply?: boolean;
  notifyCommentReaction?: boolean;
  notifySystemAlert?: boolean;
  notifyRoleChanged?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const notificationApi = {
  // Get notifications for current user
  getNotifications: async (params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> => {
    const response = await api.get('/notifications', { params });
    return response.data.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/notifications/unread-count');
    return response.data.data;
  },

  // Mark as read
  markAsRead: async (recipientId: number): Promise<NotificationRecipient> => {
    const response = await api.put(`/notifications/${recipientId}/read`);
    return response.data.data;
  },

  // Mark as seen
  markAsSeen: async (recipientId: number): Promise<NotificationRecipient> => {
    const response = await api.put(`/notifications/${recipientId}/seen`);
    return response.data.data;
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/mark-all-read');
  },

  // Archive notification
  archiveNotification: async (recipientId: number): Promise<NotificationRecipient> => {
    const response = await api.put(`/notifications/${recipientId}/archive`);
    return response.data.data;
  },

  // Delete notification
  deleteNotification: async (recipientId: number): Promise<NotificationRecipient> => {
    const response = await api.delete(`/notifications/${recipientId}`);
    return response.data.data;
  },

  // Get user settings
  getSettings: async (): Promise<UserNotificationSettings> => {
    const response = await api.get('/notifications/settings');
    return response.data.data;
  },

  // Update user settings
  updateSettings: async (
    dto: UpdateUserNotificationSettingsDto
  ): Promise<UserNotificationSettings> => {
    const response = await api.put('/notifications/settings', dto);
    return response.data.data;
  },

  // Create notification (admin/system use)
  createNotification: async (dto: CreateNotificationDto): Promise<Notification> => {
    const response = await api.post('/notifications', dto);
    return response.data.data;
  },
};

export default notificationApi;
