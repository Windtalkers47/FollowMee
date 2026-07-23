import { Repository, LessThan } from 'typeorm';
import { BaseRepository } from './base.repository';
import { NotificationQueue } from '../entities/NotificationQueue';

/**
 * Notification Queue Repository
 * 
 * Database operations for notification queue
 * 
 * W2-RATE-LIMIT: Includes upsert for race condition prevention
 */
export class NotificationQueueRepository extends BaseRepository<NotificationQueue> {
  constructor() {
    super(NotificationQueue);
  }

  /**
   * Find queue item by key components
   */
  async findByKey(
    notificationType: string,
    entityType: string,
    entityId: string,
    recipientUserId: number
  ): Promise<NotificationQueue | null> {
    return this.repository.findOne({
      where: {
        notificationType,
        entityType,
        entityId,
        recipientUserId,
      },
    });
  }

  /**
   * Find all queue items older than cutoff date
   */
  async findOlderThan(cutoffDate: Date): Promise<NotificationQueue[]> {
    return this.repository.find({
      where: {
        createdAt: LessThan(cutoffDate),
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Get queue count
   */
  async getCount(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Delete queue item
   */
  async deleteById(queueId: number): Promise<void> {
    await this.repository.delete(queueId);
  }

  /**
   * Clear entire queue
   */
  async clear(): Promise<void> {
    await this.repository.clear();
  }

  /**
   * Upsert queue item (INSERT ... ON DUPLICATE KEY UPDATE)
   * 
   * This prevents race condition when multiple events arrive simultaneously
   * 
   * W2-RATE-LIMIT: Race condition fix
   */
  async upsert(queueItem: NotificationQueue): Promise<void> {
    await this.repository.upsert(queueItem, [
      'notificationType',
      'entityType',
      'entityId',
      'recipientUserId',
    ]);
  }
}
