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
import { emailService } from './email.service';
import { pushNotificationService } from './push-notification.service';
import { NotificationMetricService } from './notification-metric.service';
import { shouldAggregate } from '../utils/notification-aggregator.util';
import { UserPreference } from '../entities/UserPreference';

export class NotificationService {
  private notificationRepository: NotificationRepository;
  private notificationRecipientRepository: NotificationRecipientRepository;
  private notificationSettingsRepository: UserNotificationSettingsRepository;
  private userRepository: Repository<User>;
  private groupActorRepository: Repository<NotificationGroupActor>;
  private pushNotificationService: typeof pushNotificationService;
  private metricService: NotificationMetricService;
  private userPreferenceRepository: Repository<UserPreference>;

  constructor(dataSource: DataSource) {
    this.notificationRepository = new NotificationRepository();
    this.notificationRecipientRepository = new NotificationRecipientRepository();
    this.notificationSettingsRepository = new UserNotificationSettingsRepository();
    this.userRepository = dataSource.getRepository(User);
    this.groupActorRepository = dataSource.getRepository(NotificationGroupActor);
    this.pushNotificationService = pushNotificationService;
    this.metricService = new NotificationMetricService(dataSource);
    this.userPreferenceRepository = dataSource.getRepository(UserPreference);
  }

  /**
   * Create a notification and send it to recipients
   * 
   * P1-DEDUPLICATION: Checks for duplicate notifications within 1 minute
   */
  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    // Step 1: Filter out self-notification
    let recipientUserIds = (dto.recipientUserIds || []).filter(
      userId => userId !== dto.actorUserId
    );

    // Step 1.5: Check for duplicate notification (P1-DEDUPLICATION)
    const duplicate = await this.findDuplicateNotification(dto);
    if (duplicate) {
      const missingRecipients: NotificationRecipient[] = [];
      for (const userId of recipientUserIds) {
        const existing = await this.notificationRecipientRepository.findByUserAndNotification(
          userId,
          duplicate.notificationId
        );
        if (!existing) {
          const recipient = new NotificationRecipient();
          recipient.notificationId = duplicate.notificationId;
          recipient.userId = userId;
          missingRecipients.push(recipient);
        }
      }
      if (missingRecipients.length > 0) {
        const savedRecipients = await this.notificationRecipientRepository.saveMany(missingRecipients);
        savedRecipients.forEach(recipient => {
          webSocketService.emitNotificationToUser(recipient.userId, {
            ...this.mapRecipientToResponseDto(Object.assign(recipient, { notification: duplicate })),
          });
        });
      }
      console.log(`[Notification] Duplicate detected; reconciled ${missingRecipients.length} missing recipients`);
      return this.mapToResponseDto(duplicate);
    }

    // Step 2: Filter recipients by their notification settings (W1-SETTINGS-CHECK)
    if (recipientUserIds.length > 0 && !dto.isGlobal) {
      const preferenceChecks = await Promise.all(
        recipientUserIds.map(async userId => ({
          userId,
          enabled: await this.notificationSettingsRepository.checkNotificationPreference(
            userId,
            dto.notificationType
          )
        }))
      );
      recipientUserIds = preferenceChecks.filter(item => item.enabled).map(item => item.userId);
    }

    // Step 3: Create notification
    const notification = new Notification();
    notification.notificationType = dto.notificationType;
    notification.title = dto.title;
    notification.message = dto.message;
    notification.titleKey = dto.titleKey;
    notification.messageKey = dto.messageKey;
    notification.translationParams = dto.translationParams;
    notification.entityType = dto.entityType;
    notification.entityId = dto.entityId;
    notification.actorUserId = dto.actorUserId;
    notification.actionUrl = dto.actionUrl;
    notification.imageUrl = dto.imageUrl;
    notification.isSystem = dto.isSystem || false;
    notification.isGlobal = dto.isGlobal || false;

    const savedNotification = await this.notificationRepository.save(notification);

    // Step 4: Create group actors if group notification
    if (dto.groupActorUserIds && dto.groupActorUserIds.length > 0) {
      for (const userId of dto.groupActorUserIds) {
        const groupActor = new NotificationGroupActor();
        groupActor.notificationId = savedNotification.notificationId;
        groupActor.actorUserId = userId;
        await this.groupActorRepository.save(groupActor);
      }
    }

    // Step 5: Create recipients (P1-BATCH)
    const recipients: NotificationRecipient[] = [];
    for (const userId of recipientUserIds) {
      const recipient = new NotificationRecipient();
      recipient.notificationId = savedNotification.notificationId;
      recipient.userId = userId;
      recipients.push(recipient);
    }

    // Batch save all recipients at once
    if (recipients.length > 0) {
      await this.notificationRecipientRepository.saveMany(recipients);
    }

    // Step 6: Send WebSocket notification (batch) - P3-PIPELINE: Realtime delivery
    if (recipientUserIds.length > 0) {
      recipients.forEach(recipient => {
        webSocketService.emitNotificationToUser(recipient.userId, {
          recipientId: recipient.recipientId,
          notificationId: savedNotification.notificationId,
          userId: recipient.userId,
          notification: this.mapToResponseDto(savedNotification),
          isRead: false,
          isSeen: false,
          isArchived: false,
          isDeleted: false,
          deliveredAt: recipient.deliveredAt || new Date()
        });
      });
      await Promise.all(recipientUserIds.map(async userId => {
        const count = await this.notificationRepository.countUnreadByUser(userId);
        webSocketService.emitUnreadCount(userId, count);
      }));
      console.log(`[Notification] WebSocket sent to ${recipientUserIds.length} users`);
    }

    // Step 7: Send Push Notification (P3-PIPELINE: For users with push enabled and active subscriptions)
    try {
      await this.sendPushNotifications(
        savedNotification,
        recipientUserIds,
        dto.notificationType
      );
    } catch (error: any) {
      console.error('[Notification] Push delivery skipped:', error?.message || error);
    }

    // Step 8: Send email notification (P3-PIPELINE: Fallback for offline users or email-priority)
    try {
      await this.sendEmailNotifications(
        savedNotification,
        recipientUserIds,
        dto.notificationType
      );
    } catch (error: any) {
      console.error('[Notification] Email delivery skipped:', error?.message || error);
    }

    // Step 9: Track analytics event (P3-PIPELINE: W5-METRICS)
    await this.trackNotificationCreated(savedNotification, recipients);

    return this.mapToResponseDto(savedNotification);
  }

  /**
   * Send push notifications to users with push enabled and active subscriptions
   * 
   * P3-PIPELINE: Automatic push delivery based on user preferences
   */
  private async sendPushNotifications(
    notification: Notification,
    recipientUserIds: number[],
    notificationType: string
  ): Promise<void> {
    // Only send push for notification types that support push
    const pushEnabledTypes = [
      'TASK_ASSIGNED',
      'TASK_COMMENT',
      'TASK_DEADLINE_NEAR',
      'TASK_UPDATED',
      'SYSTEM_ANNOUNCEMENT',
      'ROLE_CHANGED',
      'ACCOUNT_ACTIVATED',
      'CUSTOMER_ASSIGNED',
    ];

    if (!pushEnabledTypes.includes(notificationType)) {
      return;
    }

    // Get users with push enabled
    const users = recipientUserIds.length === 0
      ? []
      : await this.userRepository.find({
        where: recipientUserIds.map(userId => ({ userId, isActive: true }))
      });
    const usersWithPush: User[] = [];
    for (const user of users) {
      const settings = await this.notificationSettingsRepository.getOrCreateForUser(user.userId);
      if (settings.pushEnabled) usersWithPush.push(user);
    }

    if (usersWithPush.length === 0) {
      return;
    }

    // Send push to each user's active subscriptions
    for (const user of usersWithPush) {
      try {
        const subscriptions = await this.pushNotificationService.getSubscriptionsForUser(user.userId);
        const activeSubscriptions = subscriptions.filter(s => s.isActive);

        if (activeSubscriptions.length === 0) {
          continue; // No active subscriptions
        }

        // Get user settings for personalization
        const settings = await this.notificationSettingsRepository.getOrCreateForUser(user.userId);

        // Check Do Not Disturb mode (using quietHoursStart/End from entity)
        if (settings.doNotDisturbEnabled && this.isWithinQuietHours(settings)) {
          console.log(`[Notification] Skipping push for user ${user.userId} - Do Not Disturb mode`);
          continue;
        }

        // Check priority filter (using priorityFilter from entity)
        if (settings.priorityFilter === 'high' && !this.isHighPriority(notificationType)) {
          console.log(`[Notification] Skipping push for user ${user.userId} - Priority only mode`);
          continue;
        }

        // Send push to all active subscriptions (multi-device support)
        for (const subscription of activeSubscriptions) {
          try {
            await this.pushNotificationService.sendNotificationPush(
              {
                endpoint: subscription.endpoint,
                expirationTime: subscription.expirationTime?.toISOString() ?? null,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              {
                title: notification.title,
                message: notification.message,
                type: notificationType,
                notificationId: notification.notificationId,
                actionUrl: notification.actionUrl || '/notifications',
              },
              settings
            );
            console.log(`[Notification] Push sent to user ${user.userId} via ${subscription.endpoint.substring(0, 50)}...`);
          } catch (pushError: any) {
            // Handle expired subscription (410 error)
            if (pushError.error === 'SUBSCRIPTION_EXPIRED') {
              await this.pushNotificationService.handleExpiredSubscription(subscription.endpoint);
            }
            console.error(`[Notification] Push failed for user ${user.userId}:`, pushError.message);
          }
        }
      } catch (error: any) {
        console.error(`[Notification] Error getting subscriptions for user ${user.userId}:`, error.message);
      }
    }
  }

  /**
   * Check if current time is within Quiet Hours (Do Not Disturb)
   */
  private isWithinQuietHours(settings: UserNotificationSettings): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (settings.quietHoursStart > settings.quietHoursEnd) {
      return currentHour >= settings.quietHoursStart || currentHour < settings.quietHoursEnd;
    } else {
      // Same day range
      return currentHour >= settings.quietHoursStart && currentHour < settings.quietHoursEnd;
    }
  }

  /**
   * Check if notification type is high priority
   */
  private isHighPriority(notificationType: string): boolean {
    const highPriorityTypes = [
      'TASK_DEADLINE_NEAR',
      'SYSTEM_ANNOUNCEMENT',
      'ACCOUNT_ACTIVATED',
      'TASK_ASSIGNED',
    ];
    return highPriorityTypes.includes(notificationType);
  }

  /**
   * Send email notifications to users with email enabled
   * 
   * P3-PIPELINE: Fallback delivery channel
   * NEW-EMAIL-QUEUE: Respects daily limit (100 emails/day)
   */
  private async sendEmailNotifications(
    notification: Notification,
    recipientUserIds: number[],
    notificationType: string
  ): Promise<void> {
    // Only send email for important notification types (cost control)
    const emailEnabledTypes = [
      'TASK_ASSIGNED',
      'TASK_DEADLINE_NEAR',
      'TASK_UPDATED',
      'SYSTEM_ANNOUNCEMENT',
      'ROLE_CHANGED',
      'ACCOUNT_ACTIVATED',
    ];

    if (!emailEnabledTypes.includes(notificationType)) {
      return; // Skip email for less important notifications
    }

    // Get users with email enabled
    const users = recipientUserIds.length === 0
      ? []
      : await this.userRepository.find({
        where: recipientUserIds.map(userId => ({ userId, isActive: true }))
      });
    const usersWithEmail: User[] = [];
    for (const user of users) {
      const settings = await this.notificationSettingsRepository.getOrCreateForUser(user.userId);
      if (settings.emailEnabled) usersWithEmail.push(user);
    }

    if (usersWithEmail.length === 0) {
      return;
    }

    // Send email to each user
    for (const user of usersWithEmail) {
      const settings = await this.notificationSettingsRepository.getOrCreateForUser(user.userId);
      
      // SPRINT-5 FIX #1: Check Do Not Disturb mode
      if (settings.doNotDisturbEnabled && this.isWithinQuietHours(settings)) {
        console.log(`[Notification] Skipping email for user ${user.userId} - Do Not Disturb mode`);
        continue;
      }
      
      // SPRINT-5 FIX #2: Check priority filter
      if (settings.priorityFilter === 'high' && !this.isHighPriority(notificationType)) {
        console.log(`[Notification] Skipping email for user ${user.userId} - Priority only mode`);
        continue;
      }
      
      try {
        const preference = await this.userPreferenceRepository.findOne({
          where: { userId: user.userId },
        });
        const emailResult = await emailService.sendNotificationEmail(
          { email: user.userEmail, name: user.userName },
          {
            title: notification.title,
            message: notification.message,
            type: notificationType,
            actionUrl: notification.actionUrl || undefined,
          },
          settings,
          preference?.locale || 'en'
        );
        
        if (emailResult) {
          console.log(`[Notification] Email sent to user ${user.userId}`);
        } else {
          console.log(`[Notification] Email skipped for user ${user.userId} - Preference or quota`);
        }
      } catch (emailError: any) {
        console.error(`[Notification] Email error for user ${user.userId}:`, emailError.message);
      }
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    view: 'active' | 'archived' = 'active',
    unreadOnly: boolean = false
  ): Promise<NotificationListResponseDto> {
    const notifications = await this.notificationRecipientRepository.findByUserWithNotification(
      userId,
      limit,
      offset,
      view,
      unreadOnly
    );

    const [unreadCount, total] = await Promise.all([
      this.notificationRepository.countUnreadByUser(userId),
      this.notificationRecipientRepository.countByUser(userId, view, unreadOnly),
    ]);

    return {
      notifications: notifications.map(recipient => this.mapRecipientToResponseDto(recipient)),
      unreadCount,
      total,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: number, recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.findOwnedRecipient(userId, recipientId);
    if (!recipient) {
      return null;
    }

    const updated = await this.notificationRecipientRepository.markAsRead(recipient.recipientId);
    if (!updated) {
      return null;
    }

    updated.notification = recipient.notification;
    const count = await this.notificationRepository.countUnreadByUser(userId);
    webSocketService.emitUnreadCount(userId, count);
    return this.mapRecipientToResponseDto(updated);
  }

  async markAsUnread(userId: number, recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.findOwnedRecipient(userId, recipientId);
    if (!recipient || recipient.isDeleted || recipient.isArchived) return null;
    const updated = await this.notificationRecipientRepository.markAsUnread(recipientId);
    if (!updated) return null;
    updated.notification = recipient.notification;
    const count = await this.notificationRepository.countUnreadByUser(userId);
    webSocketService.emitUnreadCount(userId, count);
    return this.mapRecipientToResponseDto(updated);
  }

  async markAsSeen(userId: number, recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.findOwnedRecipient(userId, recipientId);
    if (!recipient) return null;
    const updated = await this.notificationRecipientRepository.markAsSeen(recipientId);
    if (!updated) return null;
    updated.notification = recipient.notification;
    return this.mapRecipientToResponseDto(updated);
  }

  async archiveNotification(userId: number, recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.findOwnedRecipient(userId, recipientId);
    if (!recipient) return null;
    const updated = await this.notificationRecipientRepository.archive(recipientId);
    if (!updated) return null;
    updated.notification = recipient.notification;
    const count = await this.notificationRepository.countUnreadByUser(userId);
    webSocketService.emitUnreadCount(userId, count);
    return this.mapRecipientToResponseDto(updated);
  }

  async restoreNotification(userId: number, recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.findOwnedRecipient(userId, recipientId);
    if (!recipient || recipient.isDeleted) return null;
    const updated = await this.notificationRecipientRepository.restore(recipientId);
    if (!updated) return null;
    updated.notification = recipient.notification;
    const count = await this.notificationRepository.countUnreadByUser(userId);
    webSocketService.emitUnreadCount(userId, count);
    return this.mapRecipientToResponseDto(updated);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<{ success: boolean }> {
    await this.notificationRecipientRepository.markAllAsRead(userId);
    webSocketService.emitUnreadCount(userId, 0);
    return { success: true };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.countUnreadByUser(userId);
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
  async deleteNotification(userId: number, recipientId: number): Promise<NotificationRecipientResponseDto | null> {
    const recipient = await this.notificationRecipientRepository.findOwnedRecipient(userId, recipientId);
    if (!recipient) {
      return null;
    }

    const updated = await this.notificationRecipientRepository.deleteForUser(recipient.recipientId);
    if (!updated) return null;
    updated.notification = recipient.notification;
    const count = await this.notificationRepository.countUnreadByUser(userId);
    webSocketService.emitUnreadCount(userId, count);
    return this.mapRecipientToResponseDto(updated);
  }

  private mapToResponseDto(notification: Notification): NotificationResponseDto {
    return {
      notificationId: notification.notificationId,
      notificationType: notification.notificationType,
      title: notification.title,
      message: notification.message,
      titleKey: notification.titleKey,
      messageKey: notification.messageKey,
      translationParams: notification.translationParams,
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

  /**
   * Get the notification setting key for a given notification type
   */
  private getSettingKey(notificationType: string): string {
    const mapping: Record<string, string> = {
      'TASK_ASSIGNED': 'notifyTaskAssigned',
      'TASK_COMMENT': 'notifyTaskComment',
      'TASK_LIKE': 'notifyTaskLike',
      'COMMENT_REPLY': 'notifyCommentReply',
      'COMMENT_REACTION': 'notifyCommentReaction',
      'ROLE_CHANGED': 'notifyRoleChanged',
      'SYSTEM_ANNOUNCEMENT': 'notifySystemAlert',
      'CUSTOMER_CREATED': 'notifySystemAlert',
      'CUSTOMER_ASSIGNED': 'notifySystemAlert',
      'CUSTOMER_FOLLOW_UP': 'notifySystemAlert',
      'TASK_UPDATED': 'notifyTaskAssigned',
      'TASK_DEADLINE_NEAR': 'notifySystemAlert',
      'TASK_COMPLETED': 'notifySystemAlert',
      'TASK_IMAGE_UPLOADED': 'notifySystemAlert',
      'ACCOUNT_ACTIVATED': 'notifySystemAlert',
    };
    return mapping[notificationType] || 'notifySystemAlert';
  }

  /**
   * Check if notification type should be aggregated
   */
  shouldAggregate(notificationType: string): boolean {
    return shouldAggregate(notificationType);
  }

  /**
   * Check for duplicate notification within 1 minute
   * 
   * P1-DEDUPLICATION: Prevents duplicate notifications
   */
  private async findDuplicateNotification(dto: CreateNotificationDto): Promise<Notification | null> {
    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

    return this.notificationRepository.findDuplicate(
      dto.notificationType,
      dto.entityType || '',
      dto.entityId || '',
      dto.actorUserId,
      dto.title,
      oneMinuteAgo
    );
  }

  /**
   * Track notification creation analytics
   * 
   * P3-PIPELINE: W5-METRICS integration
   */
  private async trackNotificationCreated(
    notification: Notification,
    recipients: NotificationRecipient[]
  ): Promise<void> {
    try {
      for (const recipient of recipients) {
        await this.metricService.recordDelivery(
          recipient.recipientId,
          recipient.userId,
          notification.notificationId,
        );
      }
      console.log(`[Notification] Analytics tracked for notification ${notification.notificationId}`);
    } catch (error: any) {
      console.error(`[Notification] Analytics tracking failed:`, error.message);
      // Don't throw - analytics failure shouldn't break notification flow
    }
  }
}

export default new NotificationService(require('../config/database').default);
