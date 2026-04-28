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
  private notificationRepo: Repository<Notification>;
  private notificationRecipientRepo: Repository<NotificationRecipient>;

  constructor(dataSource: DataSource) {
    this.notificationRepo = dataSource.getRepository(Notification);
    this.notificationRecipientRepo = dataSource.getRepository(NotificationRecipient);
    this.notificationRepository = new NotificationRepository(this.notificationRepo);
    this.notificationRecipientRepository = new NotificationRecipientRepository(
      this.notificationRecipientRepo
    );
    this.notificationSettingsRepository = new UserNotificationSettingsRepository(
      dataSource.getRepository(UserNotificationSettings)
    );
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

    if (recipientUserIds.length === 0 && !dto.isGlobal) {
      // No recipients after filtering self
      return this.mapToNotificationResponse(new Notification());
    }

    // Check for existing similar notification within last 5 minutes (for grouping)
    const existingNotification = await this.findSimilarNotification(dto);
    let savedNotification: Notification;

    if (existingNotification) {
      // Group with existing notification
      savedNotification = existingNotification;
      
      // Add actor to group if not already there
      if (dto.actorUserId && dto.groupActorUserIds) {
        const existingActors = await this.groupActorRepository.find({
          where: { notificationId: savedNotification.notificationId }
        });
        const existingActorIds = new Set(existingActors.map(a => a.actorUserId));
        
        for (const actorUserId of dto.groupActorUserIds) {
          if (!existingActorIds.has(actorUserId)) {
            const groupActor = new NotificationGroupActor();
            groupActor.notificationId = savedNotification.notificationId;
            groupActor.actorUserId = actorUserId;
            await this.groupActorRepository.save(groupActor);
          }
        }
      }
    } else {
      // Create new notification
      const notification = new Notification();
      notification.notificationType = dto.notificationType;
      notification.actorUserId = dto.actorUserId;
      notification.entityType = dto.entityType;
      notification.entityId = dto.entityId;
      notification.title = dto.title;
      notification.message = dto.message;
      notification.actionUrl = dto.actionUrl;
      notification.imageUrl = dto.imageUrl;
      notification.isSystem = dto.isSystem || false;
      notification.isGlobal = dto.isGlobal || false;

      savedNotification = await this.notificationRepository.create(notification);

      // Add group actors if provided (for Facebook-style grouping)
      if (dto.groupActorUserIds && dto.groupActorUserIds.length > 0) {
        for (const actorUserId of dto.groupActorUserIds) {
          const groupActor = new NotificationGroupActor();
          groupActor.notificationId = savedNotification.notificationId;
          groupActor.actorUserId = actorUserId;
          await this.groupActorRepository.save(groupActor);
        }
      }
    }

    // Add recipients
    const finalRecipientUserIds = [...recipientUserIds];
    if (dto.isGlobal) {
      // If global, get all active users except actor
      const allUsers = await this.userRepository.find({ where: { isActive: true } });
      finalRecipientUserIds.push(
        ...allUsers
          .map(u => u.userId)
          .filter(userId => userId !== dto.actorUserId)
      );
    }

    const notifiedUserIds: number[] = [];

    for (const userId of finalRecipientUserIds) {
      // Check if user already has this notification (avoid duplicate spam)
      const existingRecipient = await this.notificationRecipientRepo.findOne({
        where: { userId, notificationId: savedNotification.notificationId }
      });

      if (existingRecipient) {
        continue; // Skip duplicate
      }

      // Check user's notification preferences
      const shouldNotify = await this.notificationSettingsRepository.checkNotificationPreference(
        userId,
        dto.notificationType
      );

      if (shouldNotify) {
        const recipient = new NotificationRecipient();
        recipient.notificationId = savedNotification.notificationId;
        recipient.userId = userId;
        recipient.isRead = false;
        recipient.isSeen = false;
        recipient.isArchived = false;
        recipient.isDeleted = false;
        recipient.deliveredAt = new Date();
        await this.notificationRecipientRepository.create(recipient);
        notifiedUserIds.push(userId);
      }
    }

    // Emit real-time WebSocket notifications
    if (notifiedUserIds.length > 0) {
      const notificationData = this.mapToNotificationResponse(savedNotification);
      webSocketService.emitNotificationToUsers(notifiedUserIds, notificationData);

      // Update unread counts for each user
      for (const userId of notifiedUserIds) {
        const unreadCount = await this.notificationRepository.countUnreadByUser(userId);
        webSocketService.emitUnreadCount(userId, unreadCount);
      }
    }

    return this.mapToNotificationResponse(savedNotification);
  }

  /**
   * Find similar notification within last 5 minutes for grouping
   */
  private async findSimilarNotification(dto: CreateNotificationDto): Promise<Notification | null> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const similar = await this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.notificationType = :type', { type: dto.notificationType })
      .andWhere('notification.entityType = :entityType', { entityType: dto.entityType })
      .andWhere('notification.entityId = :entityId', { entityId: dto.entityId })
      .andWhere('notification.createdAt >= :fiveMinutesAgo', { fiveMinutesAgo })
      .orderBy('notification.createdAt', 'DESC')
      .getOne();

    return similar || null;
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<NotificationListResponseDto> {
    let recipients: NotificationRecipient[];

    if (unreadOnly) {
      recipients = await this.notificationRecipientRepository.findUnreadByUser(userId, limit);
    } else {
      recipients = await this.notificationRecipientRepository.findByUserWithNotification(userId, limit, offset);
    }

    const total = await this.notificationRecipientRepository.count({ userId, isDeleted: false });
    const unreadCount = await this.notificationRepository.countUnreadByUser(userId);

    return {
      notifications: recipients.map(r => this.mapToRecipientResponse(r)),
      total,
      unreadCount,
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.countUnreadByUser(userId);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.markAsRead(recipientId);
    if (!recipient) return null;
    return this.mapToRecipientResponse(recipient);
  }

  /**
   * Mark a notification as seen
   */
  async markAsSeen(recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.markAsSeen(recipientId);
    if (!recipient) return null;
    return this.mapToRecipientResponse(recipient);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRecipientRepository.markAllAsRead(userId);
  }

  /**
   * Archive a notification
   */
  async archiveNotification(recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.archive(recipientId);
    if (!recipient) return null;
    return this.mapToRecipientResponse(recipient);
  }

  /**
   * Delete a notification for a user
   */
  async deleteNotification(recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.deleteForUser(recipientId);
    if (!recipient) return null;
    return this.mapToRecipientResponse(recipient);
  }

  /**
   * Get user notification settings
   */
  async getUserSettings(userId: number): Promise<UserNotificationSettingsResponseDto> {
    const settings = await this.notificationSettingsRepository.getOrCreateForUser(userId);
    return this.mapToSettingsResponse(settings);
  }

  /**
   * Update user notification settings
   */
  async updateUserSettings(
    userId: number,
    dto: UpdateUserNotificationSettingsDto
  ): Promise<UserNotificationSettingsResponseDto> {
    const settings = await this.notificationSettingsRepository.updateSettings(userId, dto);
    if (!settings) throw new Error('Settings not found');
    return this.mapToSettingsResponse(settings);
  }

  // Helper methods to map entities to DTOs
  private mapToNotificationResponse(notification: Notification): NotificationResponseDto {
    return {
      notificationId: notification.notificationId,
      notificationType: notification.notificationType,
      actorUserId: notification.actorUserId,
      actorUser: notification.actorUser
        ? {
            userId: notification.actorUser.userId,
            userName: notification.actorUser.userName,
            userLastName: notification.actorUser.userLastName,
            userImageUrl: notification.actorUser.userImageUrl || undefined,
          }
        : undefined,
      entityType: notification.entityType,
      entityId: notification.entityId,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      imageUrl: notification.imageUrl,
      isSystem: notification.isSystem,
      isGlobal: notification.isGlobal,
      createdAt: notification.createdAt,
    };
  }

  private mapToRecipientResponse(recipient: NotificationRecipient): NotificationRecipientResponseDto {
    return {
      recipientId: recipient.recipientId,
      notificationId: recipient.notificationId,
      userId: recipient.userId,
      notification: this.mapToNotificationResponse(recipient.notification),
      isRead: recipient.isRead,
      readAt: recipient.readAt,
      isSeen: recipient.isSeen,
      seenAt: recipient.seenAt,
      isArchived: recipient.isArchived,
      archivedAt: recipient.archivedAt,
      isDeleted: recipient.isDeleted,
      deletedAt: recipient.deletedAt,
      deliveredAt: recipient.deliveredAt,
    };
  }

  private mapToSettingsResponse(settings: UserNotificationSettings): UserNotificationSettingsResponseDto {
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
