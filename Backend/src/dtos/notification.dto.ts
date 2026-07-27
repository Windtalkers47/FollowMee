import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsInt, IsDateString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  notificationType!: string;

  @IsOptional()
  actorUserId?: number;

  @IsOptional()
  entityType?: string;

  @IsOptional()
  entityId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  actionUrl?: string;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsArray()
  @IsOptional()
  recipientUserIds?: number[];

  @IsArray()
  @IsOptional()
  groupActorUserIds?: number[];

  /**
   * Use queue for aggregation (default: false)
   * If true, notification will be queued for potential aggregation
   */
  @IsOptional()
  @IsBoolean()
  useQueue?: boolean;

  /**
   * Skip queue and send immediately (default: false)
   * Takes precedence over useQueue if both are true
   */
  @IsOptional()
  @IsBoolean()
  skipQueue?: boolean;
}

export class UpdateNotificationRecipientDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isSeen?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

export class UpdateUserNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  notifyTaskAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyTaskComment?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyTaskLike?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCommentReply?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyCommentReaction?: boolean;

  @IsOptional()
  @IsBoolean()
  notifySystemAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyRoleChanged?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  // U4-PREFERENCES: New preference fields
  @IsOptional()
  @IsBoolean()
  doNotDisturbEnabled?: boolean;

  @IsOptional()
  @IsString()
  digestMode?: 'none' | 'hourly' | 'daily';

  @IsOptional()
  @IsString()
  quietHoursStart?: number;

  @IsOptional()
  @IsString()
  quietHoursEnd?: number;

  @IsOptional()
  @IsString()
  priorityFilter?: 'all' | 'high' | 'none';
}

export class NotificationQueryDto {
  @IsOptional()
  limit?: string;

  @IsOptional()
  offset?: string;

  @IsOptional()
  unreadOnly?: string;

  @IsOptional()
  view?: 'active' | 'archived';

  @IsOptional()
  read?: 'all' | 'unread';
}

/**
 * DTO สำหรับ tracking open event
 */
export class TrackOpenDto {
  @IsInt()
  @IsNotEmpty()
  recipientId!: number;

  @IsInt()
  @IsNotEmpty()
  notificationId!: number;
}

/**
 * DTO สำหรับ tracking click event
 */
export class TrackClickDto {
  @IsInt()
  @IsNotEmpty()
  recipientId!: number;

  @IsInt()
  @IsNotEmpty()
  notificationId!: number;
}

/**
 * DTO สำหรับ analytics query
 */
export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  notificationId?: number;

  @IsOptional()
  @IsInt()
  userId?: number;
}
