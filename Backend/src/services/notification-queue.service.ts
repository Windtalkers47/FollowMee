import crypto from 'crypto';
import AppDataSource from '../config/database';
import { NotificationService } from './notification.service';
import { NotificationQueueRepository } from '../repositories/notification-queue.repository';
import { NotificationQueue } from '../entities/NotificationQueue';
import { CreateNotificationDto } from '../dtos/notification.dto';
import {
  DELIVERY_LEASE_MINUTES,
  DeliveryHealth,
  calculateDeliveryBackoffMinutes,
  deliveryFailureStatus,
} from './outbox.service';
import { logger } from '../utils/logger';

const NOTIFICATION_DELAYS: Record<string, number> = {
  TASK_LIKE: 300_000,
  COMMENT_REACTION: 300_000,
  TASK_COMMENT: 120_000,
  COMMENT_REPLY: 120_000,
  TASK_ASSIGNED: 0,
  ROLE_CHANGED: 0,
  SYSTEM_ANNOUNCEMENT: 0,
  CUSTOMER_CREATED: 0,
};
const DEFAULT_DELAY = 300_000;

export class NotificationQueueService {
  private readonly queueRepository = new NotificationQueueRepository();
  private notificationService: NotificationService | null = null;
  private timer: NodeJS.Timeout | null = null;
  private activeDrain: Promise<void> | null = null;
  private readonly workerId = `notification-${process.pid}-${crypto.randomUUID()}`.slice(0, 100);

  initialize(notificationService: NotificationService): void {
    this.notificationService = notificationService;
  }

  private getDelayForType(notificationType: string): number {
    return NOTIFICATION_DELAYS[notificationType] ?? DEFAULT_DELAY;
  }

  private shouldQueue(notificationType: string): boolean {
    return this.getDelayForType(notificationType) > 0;
  }

  async queueNotification(dto: CreateNotificationDto): Promise<void> {
    if (!dto.recipientUserIds?.length) return;
    if (!this.shouldQueue(dto.notificationType)) return;

    for (const recipientUserId of dto.recipientUserIds) {
      const queueItem = new NotificationQueue();
      queueItem.deduplicationKey = this.generateKey(dto, recipientUserId);
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
      if (dto.groupActorUserIds) queueItem.setGroupActorUserIds(dto.groupActorUserIds);
      queueItem.status = 'pending';
      queueItem.attempts = 0;
      queueItem.nextAttemptAt = new Date(Date.now() + this.getDelayForType(dto.notificationType));
      queueItem.lockedAt = null;
      queueItem.lockedBy = null;
      queueItem.lastError = null;
      queueItem.deadAt = null;
      await this.queueRepository.upsert(queueItem);
    }
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.drain().catch(error => {
        logger.error(`Notification queue drain failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, 5_000);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async loadPending(): Promise<void> {
    await this.reconcile();
    await this.drain();
    this.start();
  }

  private async claimNext(deduplicationKey?: string): Promise<NotificationQueue | null> {
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const parameters: unknown[] = [];
      const keyCondition = deduplicationKey
        ? 'AND (deduplicationKey=? OR CONCAT(notificationType,\':\',entityType,\':\',entityId,\':\',recipientUserId)=?)'
        : 'AND nextAttemptAt <= NOW()';
      if (deduplicationKey) parameters.push(deduplicationKey, deduplicationKey);
      const rows = await runner.query(`
        SELECT * FROM notification_queue
        WHERE status IN ('pending','failed') ${keyCondition}
        ORDER BY queueId ASC LIMIT 1 FOR UPDATE
      `, parameters) as NotificationQueue[];
      const item = rows[0];
      if (!item) {
        await runner.commitTransaction();
        return null;
      }
      await runner.query(`
        UPDATE notification_queue
        SET status='processing',lockedAt=NOW(),lockedBy=?,attempts=attempts+1,lastError=NULL
        WHERE queueId=?
      `, [this.workerId, item.queueId]);
      await runner.commitTransaction();
      return Object.assign(new NotificationQueue(), item, { attempts: Number(item.attempts || 0) + 1 });
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async drain(limit = 25): Promise<void> {
    if (this.activeDrain) return this.activeDrain;
    const run = this.drainInternal(limit).finally(() => {
      if (this.activeDrain === run) this.activeDrain = null;
    });
    this.activeDrain = run;
    return run;
  }

  private async drainInternal(limit: number): Promise<void> {
    for (let index = 0; index < limit; index += 1) {
      const item = await this.claimNext();
      if (!item) return;
      await this.deliver(item);
    }
  }

  async flushNotification(key: string): Promise<void> {
    const item = await this.claimNext(key);
    if (item) await this.deliver(item);
  }

  private async deliver(item: NotificationQueue): Promise<void> {
    if (!this.notificationService) {
      await this.recordFailure(item, 'Notification service is not initialized');
      return;
    }
    try {
      await this.notificationService.createNotification(this.createAggregatedDto(item));
      await AppDataSource.query(
        'DELETE FROM notification_queue WHERE queueId=? AND status=\'processing\' AND lockedBy=?',
        [item.queueId, this.workerId],
      );
    } catch (error) {
      await this.recordFailure(item, error instanceof Error ? error.message : String(error));
    }
  }

  private async recordFailure(item: NotificationQueue, message: string): Promise<void> {
    const status = deliveryFailureStatus(item.attempts);
    const delayMinutes = calculateDeliveryBackoffMinutes(item.attempts);
    await AppDataSource.query(`
      UPDATE notification_queue
      SET status=?,lockedAt=NULL,lockedBy=NULL,lastError=?,
          deadAt=CASE WHEN ?='dead' THEN NOW() ELSE NULL END,
          nextAttemptAt=CASE WHEN ?='dead' THEN nextAttemptAt ELSE DATE_ADD(NOW(), INTERVAL ? MINUTE) END
      WHERE queueId=? AND status='processing' AND lockedBy=?
    `, [status, message.slice(0, 1000), status, status, delayMinutes, item.queueId, this.workerId]);
    if (status === 'dead') {
      logger.error(`Notification queue item ${item.queueId} moved to dead letter after ${item.attempts} attempts.`);
    } else {
      logger.warn(`Notification queue item ${item.queueId} failed; retry scheduled.`);
    }
  }

  async reconcile(): Promise<number> {
    const result = await AppDataSource.query(`
      UPDATE notification_queue
      SET status='failed',lockedAt=NULL,lockedBy=NULL,lastError='Recovered stale processing lease',nextAttemptAt=NOW()
      WHERE status='processing' AND lockedAt < DATE_SUB(NOW(), INTERVAL ${DELIVERY_LEASE_MINUTES} MINUTE)
    `);
    return Number(result?.affectedRows || 0);
  }

  async flushAll(): Promise<void> {
    await this.drain(100);
  }

  clearAll(): void {
    this.stop();
  }

  async getQueueSize(): Promise<number> {
    return this.queueRepository.getCount();
  }

  getTimerCount(): number {
    return this.timer ? 1 : 0;
  }

  async getHealth(): Promise<DeliveryHealth> {
    const rows = await AppDataSource.query(`
      SELECT
        SUM(status='pending') AS pending,
        SUM(status='processing') AS processing,
        SUM(status='failed') AS failed,
        SUM(status='dead') AS dead,
        SUM(status='processing' AND lockedAt < DATE_SUB(NOW(), INTERVAL ${DELIVERY_LEASE_MINUTES} MINUTE)) AS staleProcessing,
        MIN(CASE WHEN status IN ('pending','failed') THEN nextAttemptAt END) AS oldestReadyAt
      FROM notification_queue
    `);
    const row = rows[0] || {};
    return {
      pending: Number(row.pending || 0),
      processing: Number(row.processing || 0),
      failed: Number(row.failed || 0),
      dead: Number(row.dead || 0),
      staleProcessing: Number(row.staleProcessing || 0),
      oldestReadyAt: row.oldestReadyAt ? new Date(row.oldestReadyAt).toISOString() : null,
    };
  }

  private generateKey(dto: CreateNotificationDto, recipientUserId: number): string {
    return `${dto.notificationType}:${dto.entityType || ''}:${dto.entityId || ''}:${recipientUserId}`;
  }

  private createAggregatedDto(item: NotificationQueue): CreateNotificationDto {
    const actorUserIds = item.getActorUserIds();
    const actorCount = actorUserIds.length;
    return {
      notificationType: item.notificationType,
      actorUserId: actorUserIds[0],
      entityType: item.entityType,
      entityId: item.entityId,
      title: actorCount > 1 ? `${item.title} (${actorCount} updates)` : item.title,
      message: actorCount > 1 ? `${item.baseMessage} (${actorCount} people)` : item.baseMessage,
      titleKey: item.titleKey,
      messageKey: item.messageKey,
      translationParams: { ...(item.translationParams || {}), actorCount },
      actionUrl: item.actionUrl,
      imageUrl: item.imageUrl,
      isSystem: item.isSystem,
      isGlobal: item.isGlobal,
      recipientUserIds: [item.recipientUserId],
      groupActorUserIds: actorUserIds.length > 1 ? actorUserIds : undefined,
    };
  }
}

export const notificationQueueService = new NotificationQueueService();
