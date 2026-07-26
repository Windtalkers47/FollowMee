import { NotificationRecipientRepository } from '../repositories/notification-recipient.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationRecipient } from '../entities/NotificationRecipient';

/**
 * Notification Cleanup Service
 * 
 * Provides scheduled cleanup jobs for old/deleted notifications
 * to maintain database size and performance.
 */
export class NotificationCleanupService {
  private notificationRecipientRepository: NotificationRecipientRepository;
  private notificationRepository: NotificationRepository;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Default: Run cleanup every 24 hours
  private readonly DEFAULT_INTERVAL = 24 * 60 * 60 * 1000;
  
  // Delete soft-deleted notifications older than 30 days
  private readonly DELETED_RETENTION_DAYS = 30;
  
  // Archive read notifications older than 90 days
  private readonly ARCHIVE_AFTER_DAYS = 90;

  constructor() {
    this.notificationRecipientRepository = new NotificationRecipientRepository();
    this.notificationRepository = new NotificationRepository();
  }

  /**
   * Start the scheduled cleanup job
   */
  start(intervalMs: number = this.DEFAULT_INTERVAL): void {
    console.log(`[NotificationCleanup] Starting scheduled cleanup job (interval: ${intervalMs}ms)`);
    
    // Run initial cleanup
    this.runCleanup();
    
    // Schedule recurring cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMs);
  }

  /**
   * Stop the scheduled cleanup job
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[NotificationCleanup] Stopped scheduled cleanup job');
    }
  }

  /**
   * Run the cleanup job
   */
  async runCleanup(): Promise<{
    deletedCount: number;
    archivedCount: number;
  }> {
    console.log('[NotificationCleanup] Running cleanup job...');

    try {
      // Step 1: Delete soft-deleted notifications older than retention period
      const deletedCount = await this.deleteOldDeletedNotifications();

      // Step 2: Archive old read notifications
      const archivedCount = await this.archiveOldReadNotifications();

      console.log(`[NotificationCleanup] Cleanup complete. Deleted: ${deletedCount}, Archived: ${archivedCount}`);

      return { deletedCount, archivedCount };
    } catch (error) {
      console.error('[NotificationCleanup] Cleanup job failed:', error);
      throw error;
    }
  }

  /**
   * Delete soft-deleted notifications older than retention period
   */
  private async deleteOldDeletedNotifications(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.DELETED_RETENTION_DAYS);

    try {
      // Use query builder to delete old deleted notifications
      const result = await this.notificationRecipientRepository
        .getRepository()
        .createQueryBuilder('r')
        .delete()
        .where('isDeleted = :isDeleted', { isDeleted: true })
        .andWhere('deletedAt < :cutoffDate', { cutoffDate })
        .execute();

      const deletedCount = result.affected || 0;
      console.log(`[NotificationCleanup] Deleted ${deletedCount} old deleted notifications (older than ${this.DELETED_RETENTION_DAYS} days)`);
      
      return deletedCount;
    } catch (error) {
      console.error('[NotificationCleanup] Failed to delete old notifications:', error);
      return 0;
    }
  }

  /**
   * Archive old read notifications
   */
  private async archiveOldReadNotifications(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.ARCHIVE_AFTER_DAYS);

    try {
      // Use query builder to update old read notifications
      const result = await this.notificationRecipientRepository
        .getRepository()
        .createQueryBuilder('r')
        .update(NotificationRecipient)
        .set({ 
          isArchived: true,
          archivedAt: () => 'CURRENT_TIMESTAMP',
        })
        .where('isRead = :isRead', { isRead: true })
        .andWhere('isArchived = :isArchived', { isArchived: false })
        .andWhere('readAt < :cutoffDate', { cutoffDate })
        .execute();

      const archivedCount = result.affected || 0;
      console.log(`[NotificationCleanup] Archived ${archivedCount} old read notifications (older than ${this.ARCHIVE_AFTER_DAYS} days)`);
      
      return archivedCount;
    } catch (error) {
      console.error('[NotificationCleanup] Failed to archive old notifications:', error);
      return 0;
    }
  }

  /**
   * Get cleanup statistics for monitoring
   */
  async getStats(): Promise<{
    totalRecipients: number;
    deletedCount: number;
    archivedCount: number;
    unreadCount: number;
  }> {
    const repo = this.notificationRecipientRepository.getRepository();

    const totalRecipients = await repo.count();
    const deletedCount = await repo.count({ where: { isDeleted: true } });
    const archivedCount = await repo.count({ where: { isArchived: true } });
    const unreadCount = await repo.count({ where: { isRead: false, isDeleted: false } });

    return {
      totalRecipients,
      deletedCount,
      archivedCount,
      unreadCount,
    };
  }
}

// Singleton instance
export const notificationCleanupService = new NotificationCleanupService();
