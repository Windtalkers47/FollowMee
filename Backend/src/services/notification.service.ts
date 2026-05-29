import { Repository, DataSource } from 'typeorm';
import { Notification } from '../entities/Notification';
import { NotificationRecipient } from '../entities/NotificationRecipient';
import { NotificationGroupActor } from '../entities/NotificationGroupActor';
import { UserNotificationSettings } from '../entities/UserNotificationSettings';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationRecipientRepository } from '../repositories/notification-recipient.repository';
import { UserNotificationSettingsRepository } from '../repositories/user-notification-settings.repository';
import { CreateNotificationDto, UpdateUserNotificationSettingsDto } from '../dtos/notification.dto';
import {
  NotificationResponseDto,
  NotificationRecipientResponseDto,
  NotificationListResponseDto,
  UserNotificationSettingsResponseDto,
} from '../dtos/notification-response.dto';
import { User } from '../entities/User';
import { webSocketService } from './websocket.service';

export class NotificationService {
  private notificationRepository: NotificationRepository;
  private notificationRecipientRepository: NotificationRecipientRepository;
  private notificationSettingsRepository: UserNotificationSettingsRepository;
  private userRepository: Repository<User>;
  private groupActorRepository: Repository<NotificationGroupActor>;

  constructor(dataSource: DataSource) {
    this.notificationRepository = new NotificationRepository();
    this.notificationRecipientRepository = new NotificationRecipientRepository();
    this.notificationSettingsRepository = new UserNotificationSettingsRepository();
    this.userRepository = dataSource.getRepository(User);
    this.groupActorRepository = dataSource.getRepository(NotificationGroupActor);
  }

  /**
   * Create a notification and send it to recipients
   */
  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    // Filter out self-notification
    const recipientUserIds = (dto.recipientUserIds || []).filter(
      userId => userId !== dto.actorUserId
    );

    const notification = new Notification();
    notification.notificationType = dto.notificationType;
    notification.title = dto.title;
    notification.message = dto.message;
    notification.entityType = dto.entityType;
    notification.entityId = dto.entityId;
    notification.actorUserId = dto.actorUserId;
    notification.actionUrl = dto.actionUrl;
    notification.imageUrl = dto.imageUrl;
    notification.isSystem = dto.isSystem || false;
    notification.isGlobal = dto.isGlobal || false;

    const savedNotification = await this.notificationRepository.save(notification);

    // Create group actors if group notification
    if (dto.groupActorUserIds && dto.groupActorUserIds.length > 0) {
      for (const userId of dto.groupActorUserIds) {
        const groupActor = new NotificationGroupActor();
        groupActor.notificationId = savedNotification.notificationId;
        groupActor.actorUserId = userId;
        await this.groupActorRepository.save(groupActor);
      }
    }

    // Create recipients
    const recipients: NotificationRecipient[] = [];
    for (const userId of recipientUserIds) {
      const recipient = new NotificationRecipient();
      recipient.notificationId = savedNotification.notificationId;
      recipient.userId = userId;
      recipients.push(recipient);
    }

    if (recipients.length > 0) {
      await this.notificationRecipientRepository.save(recipients[0]);
      for (let i = 1; i < recipients.length; i++) {
        await this.notificationRecipientRepository.save(recipients[i]);
      }
    }

    // Send WebSocket notification
    for (const userId of recipientUserIds) {
      webSocketService.emitNotificationToUser(userId, {
        notificationId: savedNotification.notificationId,
        type: savedNotification.notificationType,
        title: savedNotification.title,
        message: savedNotification.message,
      });
    }

    return this.mapToResponseDto(savedNotification);
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20,
    includeRead: boolean = false
  ): Promise<NotificationListResponseDto> {
    const notifications = await this.notificationRecipientRepository.findByUserWithNotification(
      userId,
      limit,
      (page - 1) * limit
    );

    const unreadCount = await this.notificationRecipientRepository.findUnreadByUser(userId, 1).then(n => n.length);

    const notificationDtos = notifications.map(recipient => ({
      notification: this.mapToResponseDto(recipient.notification),
      recipient: this.mapRecipientToResponseDto(recipient),
    }));

    return {
      notifications: notificationDtos as unknown as NotificationRecipientResponseDto[],
      unreadCount,
      total: notifications.length,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: number, notificationId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.findByUserAndNotification(userId, notificationId);
    if (!recipient) {
      return null;
    }

    const updated = await this.notificationRecipientRepository.markAsRead(recipient.recipientId);
    if (!updated) {
      return null;
    }

    return this.mapRecipientToResponseDto(updated);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<{ success: boolean }> {
    await this.notificationRecipientRepository.markAllAsRead(userId);
    return { success: true };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: number): Promise<{ count: number }> {
    const count = await this.notificationRepository.countUnreadByUser(userId);
    return { count };
  }

  /**
   * Get user notification settings
   */
  async getUserSettings(userId: number): Promise<UserNotificationSettingsResponseDto> {
    const settings = await this.notificationSettingsRepository.getOrCreateForUser(userId);
    return this.mapSettingsToResponseDto(settings);
  }

  /**
   * Update user notification settings
   */
  async updateSettings(
    userId: number,
    dto: UpdateUserNotificationSettingsDto
  ): Promise<UserNotificationSettingsResponseDto> {
    const settings = await this.notificationSettingsRepository.updateSettings(userId, dto);
    if (!settings) {
      throw new Error('User notification settings not found');
    }
    return this.mapSettingsToResponseDto(settings);
  }

  /**
   * Delete notification (soft delete by marking recipient as deleted)
   */
  async deleteNotification(userId: number, notificationId: number): Promise<{ success: boolean }> {
    const recipient = await this.notificationRecipientRepository.findByUserAndNotification(userId, notificationId);
    if (!recipient) {
      throw new Error('Notification recipient not found');
    }

    await this.notificationRecipientRepository.deleteForUser(recipient.recipientId);
    return { success: true };
  }

  private mapToResponseDto(notification: Notification): NotificationResponseDto {
    return {
      notificationId: notification.notificationId,
      notificationType: notification.notificationType,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId,
      actorUserId: notification.actorUserId,
      isSystem: notification.isSystem,
      isGlobal: notification.isGlobal,
      actionUrl: notification.actionUrl,
      imageUrl: notification.imageUrl,
      createdAt: notification.createdAt,
    };
  }

  private mapRecipientToResponseDto(recipient: NotificationRecipient): NotificationRecipientResponseDto {
    return {
      recipientId: recipient.recipientId,
      notificationId: recipient.notificationId,
      userId: recipient.userId,
      isRead: recipient.isRead,
      isSeen: recipient.isSeen,
      isArchived: recipient.isArchived,
      isDeleted: recipient.isDeleted,
      readAt: recipient.readAt,
      seenAt: recipient.seenAt,
      archivedAt: recipient.archivedAt,
      deletedAt: recipient.deletedAt,
      notification: this.mapToResponseDto(recipient.notification),
      deliveredAt: recipient.deliveredAt,
    };
  }

  private mapSettingsToResponseDto(settings: UserNotificationSettings): UserNotificationSettingsResponseDto {
    return {
      settingId: settings.settingId,
      userId: settings.userId,
      notifyTaskAssigned: settings.notifyTaskAssigned,
      notifyTaskComment: settings.notifyTaskComment,
      notifyTaskLike: settings.notifyTaskLike,
      notifyCommentReply: settings.notifyCommentReply,
      notifyCommentReaction: settings.notifyCommentReaction,
      notifySystemAlert: settings.notifySystemAlert,
      notifyRoleChanged: settings.notifyRoleChanged,
      emailEnabled: settings.emailEnabled,
      pushEnabled: settings.pushEnabled,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}

export default new NotificationService(require('../config/database').default);