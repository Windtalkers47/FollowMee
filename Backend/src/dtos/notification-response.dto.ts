export interface NotificationResponseDto {
  notificationId: number;
  notificationType: string;
  actorUserId?: number;
  actorUser?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
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
  createdAt: Date;
}

export interface NotificationRecipientResponseDto {
  recipientId: number;
  notificationId: number;
  userId: number;
  notification: NotificationResponseDto;
  isRead: boolean;
  readAt?: Date;
  isSeen: boolean;
  seenAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deliveredAt: Date;
}

export interface NotificationListResponseDto {
  notifications: NotificationRecipientResponseDto[];
  total: number;
  unreadCount: number;
}

export interface UserNotificationSettingsResponseDto {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationGroupActorResponseDto {
  groupActorId: number;
  notificationId: number;
  actorUserId: number;
  actorUser?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
  createdAt: Date;
}
