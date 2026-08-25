import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dtos/notification.dto';
import { notificationQueueService } from '../services/notification-queue.service';
import { shouldAggregate as checkShouldAggregate } from '../utils/notification-aggregator.util';

/**
 * Notification types enum for type safety
 */
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
  PUBLIC_PROFILE_LEAD = 'PUBLIC_PROFILE_LEAD',
  ACHIEVEMENT_EARNED = 'ACHIEVEMENT_EARNED',
  REGISTRATION_APPROVAL_REQUIRED = 'REGISTRATION_APPROVAL_REQUIRED',
  SYSTEM_CAPACITY_ALERT = 'SYSTEM_CAPACITY_ALERT',
  PRIVACY_REQUEST_RECEIVED = 'PRIVACY_REQUEST_RECEIVED',
}

  /**
   * Helper class to create notifications easily from anywhere in the application
   */
  export class NotificationHelper {
    private static notificationService: NotificationService | null = null;

  static initialize(service: NotificationService): void {
      this.notificationService = service;
      // Also initialize the queue service
      notificationQueueService.initialize(service);
    }

  /**
   * Create a task assignment notification
   * Task assignments are sent immediately (not aggregated)
   */
  static async notifyTaskAssigned(
    taskTitle: string,
    taskUrl: string,
    actorUserId: number,
    recipientUserIds: number[]
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.TASK_ASSIGNED,
      actorUserId,
      entityType: 'task',
      entityId: taskUrl.split('/').pop() || '',
      title: 'New Task Assigned',
      message: `You have been assigned to task: ${taskTitle}`,
      titleKey: 'notification.content.taskAssigned.title',
      messageKey: 'notification.content.taskAssigned.message',
      translationParams: { taskTitle },
      actionUrl: taskUrl,
      recipientUserIds,
      skipQueue: true, // Send immediately
    });
  }

  static async notifyAchievementEarned(userId: number, badgeName: string, badgeKey: string): Promise<void> {
    await this.createNotification({ notificationType: NotificationType.ACHIEVEMENT_EARNED, entityType: 'achievement', entityId: badgeKey, title: 'Achievement earned', message: `You unlocked ${badgeName}.`, titleKey: 'notification.content.achievementEarned.title', messageKey: 'notification.content.achievementEarned.message', translationParams: { achievementName: badgeName }, actionUrl: `/rewards?tab=achievements&achievement=${encodeURIComponent(badgeKey)}`, recipientUserIds: [userId], skipQueue: true });
  }

  static async notifyTaskUpdated(
    taskTitle: string,
    taskId: string,
    actorUserId: number,
    recipientUserIds: number[],
    message = `Task "${taskTitle}" was updated`
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.TASK_UPDATED,
      actorUserId,
      entityType: 'task',
      entityId: taskId,
      title: 'Task updated',
      message,
      titleKey: 'notification.content.taskUpdated.title',
      messageKey: 'notification.content.taskUpdated.message',
      translationParams: { taskTitle },
      actionUrl: `/tasks/${taskId}`,
      recipientUserIds: [...new Set(recipientUserIds)],
      skipQueue: true,
    });
  }

  static async notifyTaskStatus(
    type: NotificationType.TASK_UPDATED | NotificationType.TASK_COMPLETED,
    title: string,
    message: string,
    taskTitle: string,
    taskId: string,
    actorUserId: number,
    recipientUserIds: number[]
  ): Promise<void> {
    await this.createNotification({
      notificationType: type,
      actorUserId,
      entityType: 'task',
      entityId: taskId,
      title,
      message: `${taskTitle}: ${message}`,
      titleKey: type === NotificationType.TASK_COMPLETED
        ? 'notification.content.taskCompleted.title'
        : 'notification.content.taskUpdated.title',
      messageKey: type === NotificationType.TASK_COMPLETED
        ? 'notification.content.taskCompleted.message'
        : 'notification.content.taskUpdated.message',
      translationParams: { taskTitle },
      actionUrl: `/tasks/${taskId}`,
      recipientUserIds: [...new Set(recipientUserIds)],
      skipQueue: true,
    });
  }

  static async notifyTaskDeadline(
    taskTitle: string,
    taskId: string,
    recipientUserIds: number[]
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.TASK_DEADLINE_NEAR,
      entityType: 'task',
      entityId: taskId,
      title: 'Task due soon',
      message: `"${taskTitle}" is due within 24 hours`,
      titleKey: 'notification.content.taskDeadline.title',
      messageKey: 'notification.content.taskDeadline.message',
      translationParams: { taskTitle },
      actionUrl: `/tasks/${taskId}`,
      recipientUserIds,
      skipQueue: true,
    });
  }

  /**
   * Create a task comment notification
   * Comments are aggregated within 2 minutes
   */
  static async notifyTaskComment(
    taskTitle: string,
    taskUrl: string,
    actorUserId: number,
    recipientUserIds: number[],
    commentId?: number
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.TASK_COMMENT,
      actorUserId,
      entityType: 'task',
      entityId: taskUrl.split('/').pop() || '',
      title: 'New Comment on Task',
      message: `${taskTitle} has a new comment`,
      titleKey: 'notification.content.taskComment.title',
      messageKey: 'notification.content.taskComment.message',
      translationParams: { taskTitle },
      actionUrl: commentId ? `${taskUrl}?comment=${commentId}` : taskUrl,
      recipientUserIds,
      skipQueue: true,
    });
  }

  /**
   * Create a task like notification
   * Likes are aggregated within 5 minutes to reduce spam
   */
  static async notifyTaskLike(
    taskTitle: string,
    taskUrl: string,
    actorUserId: number,
    recipientUserIds: number[],
    groupActorUserIds?: number[]
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.TASK_LIKE,
      actorUserId,
      entityType: 'task',
      entityId: taskUrl.split('/').pop() || '',
      title: 'Task Liked',
      message: `Your task "${taskTitle}" received a like`,
      titleKey: 'notification.content.taskLike.title',
      messageKey: 'notification.content.taskLike.message',
      translationParams: { taskTitle },
      actionUrl: taskUrl,
      recipientUserIds,
      groupActorUserIds,
      skipQueue: true,
    });
  }

  /**
   * Create a comment reply notification
   * Replies are aggregated within 2 minutes
   */
  static async notifyCommentReply(
    taskTitle: string,
    taskUrl: string,
    actorUserId: number,
    recipientUserIds: number[],
    parentCommentId?: number
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.COMMENT_REPLY,
      actorUserId,
      entityType: 'comment_reply',
      entityId: parentCommentId ? `${taskUrl.split('/').pop()}-${parentCommentId}` : taskUrl.split('/').pop() || '',
      title: 'Comment Reply',
      message: `Someone replied to your comment on "${taskTitle}"`,
      titleKey: 'notification.content.commentReply.title',
      messageKey: 'notification.content.commentReply.message',
      translationParams: { taskTitle },
      actionUrl: parentCommentId ? `${taskUrl}?comment=${parentCommentId}` : taskUrl,
      recipientUserIds,
      skipQueue: true,
    });
  }

  static async notifyCommentReaction(
    taskTitle: string,
    taskUrl: string,
    actorUserId: number,
    recipientUserIds: number[],
    commentId: number
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.COMMENT_REACTION,
      actorUserId,
      entityType: 'comment',
      entityId: String(commentId),
      title: 'New reaction',
      message: `Your comment on "${taskTitle}" received a reaction`,
      titleKey: 'notification.content.commentReaction.title',
      messageKey: 'notification.content.commentReaction.message',
      translationParams: { taskTitle },
      actionUrl: `${taskUrl}?comment=${commentId}`,
      recipientUserIds,
      skipQueue: true,
    });
  }

  static async notifyMention(
    taskTitle: string,
    taskUrl: string,
    actorUserId: number,
    recipientUserIds: number[],
    commentId?: number
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.MENTION,
      actorUserId,
      entityType: 'task_comment',
      entityId: taskUrl.split('/').pop() || '',
      title: 'You were mentioned',
      message: `You were mentioned in a comment on "${taskTitle}"`,
      titleKey: 'notification.content.mention.title',
      messageKey: 'notification.content.mention.message',
      translationParams: { taskTitle },
      actionUrl: commentId ? `${taskUrl}?comment=${commentId}` : taskUrl,
      recipientUserIds,
      skipQueue: true,
    });
  }

  /**
   * Create a role change notification
   * Role changes are sent immediately (not aggregated)
   */
  static async notifyRoleChanged(
    newRole: string,
    actorUserId: number,
    recipientUserIds: number[],
    userId: number
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.ROLE_CHANGED,
      actorUserId,
      entityType: 'user',
      entityId: String(userId),
      title: 'Role Changed',
      message: `Your role has been changed to ${newRole}`,
      titleKey: 'notification.content.roleChanged.title',
      messageKey: 'notification.content.roleChanged.message',
      translationParams: { role: newRole },
      actionUrl: '/settings',
      recipientUserIds,
      skipQueue: true, // Send immediately
    });
  }

  static async notifyProfileUpdatedByAdmin(
    displayName: string,
    actorUserId: number,
    recipientUserId: number,
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.PROFILE_UPDATED_BY_ADMIN,
      actorUserId,
      entityType: 'user',
      entityId: String(recipientUserId),
      title: 'Profile updated',
      message: `Profile details for ${displayName} were updated by an administrator.`,
      titleKey: 'notification.content.profileUpdatedByAdmin.title',
      messageKey: 'notification.content.profileUpdatedByAdmin.message',
      translationParams: { displayName },
      actionUrl: '/settings',
      recipientUserIds: [recipientUserId],
      skipQueue: true,
    });
  }

  /**
   * Create a system announcement
   * System announcements are sent immediately (not aggregated)
   */
  static async notifySystemAnnouncement(
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.SYSTEM_ANNOUNCEMENT,
      title,
      message,
      actionUrl,
      isSystem: true,
      isGlobal: true,
      recipientUserIds: [],
      skipQueue: true, // Send immediately
    });
  }

  static async notifyRewardRedemption(
    title: string,
    message: string,
    actorUserId: number,
    recipientUserIds: number[],
    redemptionId: number,
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.SYSTEM_ANNOUNCEMENT,
      actorUserId,
      entityType: 'reward_redemption',
      entityId: String(redemptionId),
      title,
      message,
      actionUrl: '/rewards',
      recipientUserIds,
      skipQueue: true,
    });
  }

  static async notifyRewardAchievement(userId: number, seasonId: number, rank: number): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.SYSTEM_ANNOUNCEMENT,
      entityType: 'reward_season', entityId: String(seasonId),
      title: `Season #${rank} achievement`, message: `You finished the season at rank #${rank}. Your badge and Aura are ready.`,
      titleKey: 'notification.reward.seasonRank.title', messageKey: 'notification.reward.seasonRank.message',
      translationParams: { rank, seasonId }, actionUrl: '/rewards', recipientUserIds: [userId], skipQueue: true,
    });
  }

  /**
   * Create a customer created notification
   * Customer creation is sent immediately (not aggregated)
   */
  static async notifyCustomerCreated(
    customerName: string,
    customerUrl: string,
    actorUserId: number,
    recipientUserIds: number[]
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.CUSTOMER_CREATED,
      actorUserId,
      entityType: 'customer',
      entityId: customerUrl.split('/').pop() || '',
      title: 'New Customer Created',
      message: `Customer "${customerName}" has been created`,
      titleKey: 'notification.content.customerCreated.title',
      messageKey: 'notification.content.customerCreated.message',
      translationParams: { customerName },
      actionUrl: customerUrl,
      recipientUserIds,
      skipQueue: true, // Send immediately
    });
  }

  static async notifyPublicProfileLead(profileName: string, leadId: string, recipientUserIds: number[]): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.PUBLIC_PROFILE_LEAD,
      entityType: 'public_profile_lead',
      entityId: leadId,
      title: 'New profile lead',
      message: `${profileName} received a new lead`,
      titleKey: 'notification.content.profileLead.title',
      messageKey: 'notification.content.profileLead.message',
      translationParams: { profileName },
      actionUrl: `/customer-profile/leads?leadId=${encodeURIComponent(leadId)}`,
      recipientUserIds: [...new Set(recipientUserIds)],
      skipQueue: true,
    });
  }

  static async notifyRegistrationApproval(requestId: string, recipientUserIds: number[]): Promise<void> {
    if (!recipientUserIds.length) return;
    await this.createNotification({ notificationType: NotificationType.REGISTRATION_APPROVAL_REQUIRED, entityType: 'registration_request', entityId: requestId, title: 'Registration approval required', message: 'A verified UAT registration is waiting for Owner approval.', actionUrl: `/users/registration-requests?requestId=${encodeURIComponent(requestId)}`, recipientUserIds, skipQueue: true });
  }

  static async notifySystemCapacity(provider: string, resource: string, threshold: number, recipientUserIds: number[]): Promise<void> {
    if (!recipientUserIds.length) return;
    await this.createNotification({ notificationType: NotificationType.SYSTEM_CAPACITY_ALERT, entityType: 'system_capacity', entityId: `${provider}:${resource}:${threshold}`, title: 'Free-tier capacity alert', message: `${provider} ${resource} reached ${threshold}% of its verified limit.`, actionUrl: '/system-capacity', recipientUserIds, skipQueue: true });
  }

  static async notifyPrivacyRequest(requestId: string, requestType: string, recipientUserIds: number[]): Promise<void> {
    if (!recipientUserIds.length) return;
    await this.createNotification({ notificationType: NotificationType.PRIVACY_REQUEST_RECEIVED, entityType: 'privacy_request', entityId: requestId, title: 'Verified privacy request', message: `A verified ${requestType} request is waiting for review.`, actionUrl: `/privacy-requests?requestId=${encodeURIComponent(requestId)}`, recipientUserIds, skipQueue: true });
  }

  /**
   * Generic notification creation method
   * Supports queue-based aggregation for reducing spam
   */
  private static async createNotification(dto: CreateNotificationDto): Promise<void> {
    if (!this.notificationService) {
      throw new Error('NotificationHelper not initialized. Call NotificationHelper.initialize() first.');
    }

    try {
      // Check if notification should be queued for aggregation
      const useQueue = dto.useQueue !== false && !dto.skipQueue;
      const shouldQueue = useQueue && checkShouldAggregate(dto.notificationType);

      if (shouldQueue) {
        // Queue for aggregation
        await notificationQueueService.queueNotification(dto);
      } else {
        // Send immediately
        await this.notificationService.createNotification(dto);
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
      // A secondary delivery pipeline must never fail the task/comment action.
    }
  }
}
