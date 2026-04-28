import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dtos/notification.dto';

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
  TASK_IMAGE_UPLOADED = 'TASK_IMAGE_UPLOADED',

  // Admin/System
  ROLE_CHANGED = 'ROLE_CHANGED',
  ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',

  // Customer Module
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_ASSIGNED = 'CUSTOMER_ASSIGNED',
  CUSTOMER_FOLLOW_UP = 'CUSTOMER_FOLLOW_UP',
}

/**
 * Helper class to create notifications easily from anywhere in the application
 */
export class NotificationHelper {
  private static notificationService: NotificationService | null = null;

  static initialize(service: NotificationService) {
    this.notificationService = service;
  }

  /**
   * Create a task assignment notification
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
      actionUrl: taskUrl,
      recipientUserIds,
    });
  }

  /**
   * Create a task comment notification
   */
  static async notifyTaskComment(
    taskTitle: string,
    taskUrl: string,
    actorUserId: number,
    recipientUserIds: number[]
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.TASK_COMMENT,
      actorUserId,
      entityType: 'task',
      entityId: taskUrl.split('/').pop() || '',
      title: 'New Comment on Task',
      message: `${taskTitle} has a new comment`,
      actionUrl: taskUrl,
      recipientUserIds,
    });
  }

  /**
   * Create a task like notification
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
      actionUrl: taskUrl,
      recipientUserIds,
      groupActorUserIds,
    });
  }

  /**
   * Create a comment reply notification
   */
  static async notifyCommentReply(
    taskTitle: string,
    taskUrl: string,
    actorUserId: number,
    recipientUserIds: number[]
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.COMMENT_REPLY,
      actorUserId,
      entityType: 'comment',
      entityId: taskUrl.split('/').pop() || '',
      title: 'Comment Reply',
      message: `Someone replied to your comment on "${taskTitle}"`,
      actionUrl: taskUrl,
      recipientUserIds,
    });
  }

  /**
   * Create a role change notification
   */
  static async notifyRoleChanged(
    newRole: string,
    actorUserId: number,
    recipientUserIds: number[]
  ): Promise<void> {
    await this.createNotification({
      notificationType: NotificationType.ROLE_CHANGED,
      actorUserId,
      entityType: 'role',
      entityId: '',
      title: 'Role Changed',
      message: `Your role has been changed to ${newRole}`,
      recipientUserIds,
    });
  }

  /**
   * Create a system announcement
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
    });
  }

  /**
   * Create a customer created notification
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
      actionUrl: customerUrl,
      recipientUserIds,
    });
  }

  /**
   * Generic notification creation method
   */
  private static async createNotification(dto: CreateNotificationDto): Promise<void> {
    if (!this.notificationService) {
      console.error('NotificationHelper not initialized. Call NotificationHelper.initialize() first.');
      return;
    }

    try {
      await this.notificationService.createNotification(dto);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }
}
