import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

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
}

export class NotificationQueryDto {
  @IsOptional()
  limit?: string;

  @IsOptional()
  offset?: string;

  @IsOptional()
  unreadOnly?: string;
}
