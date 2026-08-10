export enum NotificationType {
  // Task Module
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DEADLINE_NEAR = 'TASK_DEADLINE_NEAR',
  TASK_COMPLETED = 'TASK_COMPLETED',

  // Social Interaction
  TASK_COMMENT = 'TASK_COMMENT',
  COMMENT_REPLY = 'COMMENT_REPLY',
  TASK_LIKE = 'TASK_LIKE',
  COMMENT_REACTION = 'COMMENT_REACTION',
  MENTION = 'MENTION',
  TASK_IMAGE_UPLOADED = 'TASK_IMAGE_UPLOADED',

  // Admin/System
  ROLE_CHANGED = 'ROLE_CHANGED',
  PROFILE_UPDATED_BY_ADMIN = 'PROFILE_UPDATED_BY_ADMIN',
  ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',

  // Customer Module
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_ASSIGNED = 'CUSTOMER_ASSIGNED',
  CUSTOMER_FOLLOW_UP = 'CUSTOMER_FOLLOW_UP',
}

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
  titleKey?: string;
  messageKey?: string;
  translationParams?: Record<string, string | number>;
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
  notifyProfileChanged: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  doNotDisturbEnabled: boolean;
  digestMode: 'none' | 'hourly' | 'daily' | 'weekly';
  digestDay: number | null;
  digestTime: string;
  timezone: string;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  priorityFilter: 'all' | 'high' | 'none';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserNotificationSettingsDto {
  notifyTaskAssigned?: boolean;
  notifyTaskComment?: boolean;
  notifyTaskLike?: boolean;
  notifyCommentReply?: boolean;
  notifyCommentReaction?: boolean;
  notifySystemAlert?: boolean;
  notifyRoleChanged?: boolean;
  notifyProfileChanged?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  digestMode?: 'none' | 'hourly' | 'daily' | 'weekly';
  digestDay?: number | null;
  digestTime?: string;
  timezone?: string;
}
