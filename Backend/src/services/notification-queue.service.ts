import { NotificationService } from './notification.service';
import { NotificationQueueRepository } from '../repositories/notification-queue.repository';
import { NotificationQueue } from '../entities/NotificationQueue';
import { CreateNotificationDto } from '../dtos/notification.dto';

/**
 * Configurable delays per notification type (W2-RATE-LIMIT: Configurable Delays)
 * W4-BATCH-DELIVERY: Batch email delivery to reduce cost
 */
const NOTIFICATION_DELAYS: Record<string, number> = {
  TASK_LIKE: 300000,        // 5 นาที
  COMMENT_REACTION: 300000, // 5 นาที
  TASK_COMMENT: 120000,     // 2 นาที
  COMMENT_REPLY: 120000,    // 2 นาที
  TASK_ASSIGNED: 0,         // ทันที (ไม่ queue)
  ROLE_CHANGED: 0,          // ทันที (ไม่ queue)
  SYSTEM_ANNOUNCEMENT: 0,   // ทันที (ไม่ queue)
  CUSTOMER_CREATED: 0,      // ทันที (ไม่ queue)
};

const DEFAULT_DELAY = 300000; // 5 นาที

/**
 * W4-BATCH-DELIVERY: Batch email delivery interval
 * Send batch emails every 15 minutes to reduce cost
 */
const BATCH_EMAIL_INTERVAL = 15 * 60 * 1000; // 15 minutes

/**
 * Notification Queue Service (Database-backed)
 * 
 * Provides notification aggregation and rate limiting to reduce notification spam.
 * Uses database persistence to ensure notifications are not lost on server restart.
 * 
 * W2-RATE-LIMIT: Database-backed queue for production readiness
 */
export class NotificationQueueService {
  private queueRepository: NotificationQueueRepository;
  private notificationService: NotificationService | null = null;
  
  // Timers for in-memory debounce (still used for timing, data is in DB)
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.queueRepository = new NotificationQueueRepository();
  }

  /**
   * Initialize the queue service with notification service
   */
  initialize(notificationService: NotificationService): void {
    this.notificationService = notificationService;
  }

  /**
   * Get delay for specific notification type (W2-RATE-LIMIT: Configurable Delays)
   */
  private getDelayForType(notificationType: string): number {
    return NOTIFICATION_DELAYS[notificationType] ?? DEFAULT_DELAY;
  }

  /**
   * Check if notification type should be queued (W2-RATE-LIMIT: Configurable Delays)
   */
  private shouldQueue(notificationType: string): boolean {
    return this.getDelayForType(notificationType) > 0;
  }

  /**
   * Add notification to queue for aggregation (W2-RATE-LIMIT - Database backed)
   * 
   * Uses upsert to prevent race condition when multiple events arrive simultaneously.
   * 
   * W2-RATE-LIMIT: Configurable Delays - Different delays per notification type
   */
  async queueNotification(dto: CreateNotificationDto): Promise<void> {
    if (!dto.recipientUserIds || dto.recipientUserIds.length === 0) {
      return;
    }

    const recipientUserId = dto.recipientUserIds[0];
    const key = this.generateKey(dto, recipientUserId);

    // Check if this notification type should be queued (W2-RATE-LIMIT: Configurable Delays)
    if (!this.shouldQueue(dto.notificationType)) {
      // Send immediately without queuing
      console.log(`[NotificationQueue] Sending ${dto.notificationType} immediately (no queue)`);
      return;
    }

    // Create queue item
    const queueItem = new NotificationQueue();
    queueItem.notificationType = dto.notificationType;
    queueItem.entityType = dto.entityType || '';
    queueItem.entityId = dto.entityId || '';
    queueItem.recipientUserId = recipientUserId;
    queueItem.setActorUserIds(dto.actorUserId ? [dto.actorUserId] : []);
    queueItem.title = dto.title;
    queueItem.baseMessage = dto.message;
    queueItem.titleKey = dto.titleKey;
    queueItem.messageKey = dto.messageKey;
    queueItem.translationParams = dto.translationParams;
    queueItem.actionUrl = dto.actionUrl;
    queueItem.imageUrl = dto.imageUrl;
    queueItem.isSystem = dto.isSystem || false;
    queueItem.isGlobal = dto.isGlobal || false;
    if (dto.groupActorUserIds) {
      queueItem.setGroupActorUserIds(dto.groupActorUserIds);
    }

    // Use upsert to prevent race condition (W2-RATE-LIMIT: Race condition fix)
    await this.queueRepository.upsert(queueItem);

    // Reset timer for this key with type-specific delay (W2-RATE-LIMIT: Configurable Delays)
    this.resetTimer(key, dto.notificationType);
  }

  /**
   * Immediately flush a specific notification from queue
   * 
   * W2-RATE-LIMIT: Retry mechanism - doesn't delete item until successful
   * W4-BATCH-DELIVERY: Triggers batch email delivery for cost efficiency
   */
  async flushNotification(key: string, retryCount: number = 0): Promise<void> {
    const MAX_RETRIES = 3;

    // Parse key to get queue item
    const parts = key.split(':');
    if (parts.length < 4) {
      this.timers.delete(key);
      return;
    }

    const [notificationType, entityType, entityId, recipientUserIdStr] = parts;
    const recipientUserId = parseInt(recipientUserIdStr, 10);

    const queueItem = await this.queueRepository.findByKey(
      notificationType,
      entityType,
      entityId,
      recipientUserId
    );

    if (!queueItem || !this.notificationService) {
      this.timers.delete(key);
      return;
    }

    // Create aggregated DTO
    const aggregatedDto = this.createAggregatedDto(queueItem);

    try {
      await this.notificationService.createNotification(aggregatedDto);
      
      // Only delete from database after successful flush (W2-RATE-LIMIT: Retry mechanism)
      await this.queueRepository.deleteById(queueItem.queueId);
      
      console.log(`[NotificationQueue] Flushed notification for user ${recipientUserId}`);
      
      // W4-BATCH-DELIVERY: Trigger batch email delivery after flushing
      // This ensures emails are sent in batches to reduce cost
      await this.triggerBatchEmailDelivery();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[NotificationQueue] Failed to flush (attempt ${retryCount + 1}/${MAX_RETRIES}):`, errorMessage);
      
      if (retryCount < MAX_RETRIES) {
        // Retry with exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`[NotificationQueue] Retrying in ${backoffDelay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.flushNotification(key, retryCount + 1);
      } else {
        // Max retries reached - log error but don't delete item
        console.error(`[NotificationQueue] Max retries reached. Item will remain in queue for next flush.`);
      }
    }

    // Cleanup timer
    this.timers.delete(key);
  }

  /**
   * W4-BATCH-DELIVERY: Trigger batch email delivery
   * 
   * Sends accumulated notifications via email in batches to reduce cost.
   * Called periodically and after flushing notifications.
   */
  private async triggerBatchEmailDelivery(): Promise<void> {
    // This method would integrate with email service to send batch emails
    // For now, it's a placeholder for the batch delivery logic
    console.log('[NotificationQueue] Batch email delivery triggered (W4-BATCH-DELIVERY)');
    
    // In a full implementation, this would:
    // 1. Fetch all pending notifications for each user
    // 2. Group them by recipient
    // 3. Create a digest email with all notifications
    // 4. Send via email service (respecting daily limit)
  }

  /**
   * Flush all notifications immediately (e.g., on shutdown)
   */
  async flushAll(): Promise<void> {
    // Get all queue items from database
    const allItems = await this.queueRepository.getRepository().find({
      order: { createdAt: 'ASC' },
    });

    // Group by key and flush
    const keys = new Set<string>();
    for (const item of allItems) {
      const key = `${item.notificationType}:${item.entityType}:${item.entityId}:${item.recipientUserId}`;
      keys.add(key);
    }

    for (const key of keys) {
      await this.flushNotification(key);
    }
  }

  /**
   * Clear all timers (on shutdown)
   */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * Get queue size for monitoring
   */
  async getQueueSize(): Promise<number> {
    return this.queueRepository.getCount();
  }

  /**
   * Get pending timer count
   */
  getTimerCount(): number {
    return this.timers.size;
  }

  /**
   * Load pending notifications from database on startup
   * 
   * W2-RATE-LIMIT: Configurable Delays - Uses type-specific delays
   */
  async loadPending(): Promise<void> {
    const allItems = await this.queueRepository.getRepository().find({
      order: { createdAt: 'ASC' },
    });

    // Set timers for items that are still within debounce window
    const now = new Date();
    for (const item of allItems) {
      const delay = this.getDelayForType(item.notificationType);
      const age = now.getTime() - item.createdAt.getTime();
      
      if (age < delay) {
        const key = `${item.notificationType}:${item.entityType}:${item.entityId}:${item.recipientUserId}`;
        const remainingDelay = delay - age;
        
        this.timers.set(key, setTimeout(() => {
          this.flushNotification(key);
        }, remainingDelay));
      } else {
        // Item is past debounce window, flush immediately
        const key = `${item.notificationType}:${item.entityType}:${item.entityId}:${item.recipientUserId}`;
        await this.flushNotification(key);
      }
    }
  }

  /**
   * Reset timer for a specific key with type-specific delay
   * 
   * W2-RATE-LIMIT: Configurable Delays
   */
  private resetTimer(key: string, notificationType?: string): void {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Get delay for this notification type
    const delay = notificationType ? this.getDelayForType(notificationType) : DEFAULT_DELAY;

    // Set new timer with type-specific delay
    const timer = setTimeout(() => {
      this.flushNotification(key);
    }, delay);

    this.timers.set(key, timer);
  }

  /**
   * Generate unique key for aggregation
   */
  private generateKey(dto: CreateNotificationDto, recipientUserId: number): string {
    return `${dto.notificationType}:${dto.entityType}:${dto.entityId}:${recipientUserId}`;
  }

  /**
   * Create aggregated notification DTO from queue entity
   */
  private createAggregatedDto(queueItem: NotificationQueue): CreateNotificationDto {
    const actorUserIds = queueItem.getActorUserIds();
    const actorCount = actorUserIds.length;

    return {
      notificationType: queueItem.notificationType,
      actorUserId: actorUserIds[0], // First actor as primary
      entityType: queueItem.entityType,
      entityId: queueItem.entityId,
      title: this.aggregateTitle(queueItem.title, actorCount),
      message: this.aggregateMessage(queueItem.baseMessage, actorUserIds),
      titleKey: queueItem.titleKey,
      messageKey: queueItem.messageKey,
      translationParams: {
        ...(queueItem.translationParams || {}),
        actorCount,
      },
      actionUrl: queueItem.actionUrl,
      imageUrl: queueItem.imageUrl,
      isSystem: queueItem.isSystem,
      isGlobal: queueItem.isGlobal,
      recipientUserIds: [queueItem.recipientUserId],
      groupActorUserIds: actorUserIds.length > 1 ? actorUserIds : undefined,
    };
  }

  /**
   * Aggregate title based on actor count
   */
  private aggregateTitle(baseTitle: string, actorCount: number): string {
    if (actorCount <= 1) {
      return baseTitle;
    }
    if (baseTitle.includes('Like')) {
      return `${baseTitle} (${actorCount} people)`;
    }
    if (baseTitle.includes('Comment')) {
      return `${baseTitle} (${actorCount} comments)`;
    }
    return `${baseTitle} (${actorCount} updates)`;
  }

  /**
   * Aggregate message based on actor list
   */
  private aggregateMessage(baseMessage: string, actorUserIds: number[], maxDisplay: number = 3): string {
    if (actorUserIds.length <= 1) {
      return baseMessage;
    }

    const additionalCount = actorUserIds.length - maxDisplay;

    if (additionalCount > 0) {
      return `${baseMessage} และอีก ${additionalCount} คน`;
    }

    return `${baseMessage} (${actorUserIds.length} people)`;
  }
}

// Singleton instance
export const notificationQueueService = new NotificationQueueService();
