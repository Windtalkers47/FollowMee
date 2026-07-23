import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Notification } from '../entities/Notification';
import dataSource from '../config/database';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(Notification);
  }

  async findWithRecipients(notificationId: number): Promise<Notification | null> {
    return this.repository.findOne({
      where: { notificationId },
      relations: ['actorUser'],
    });
  }

  async findByTypeAndEntity(
    notificationType: string,
    entityType: string,
    entityId: string
  ): Promise<Notification[]> {
    return this.repository.find({
      where: {
        notificationType,
        entityType,
        entityId,
      },
      relations: ['actorUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findRecentByUser(userId: number, limit: number = 20): Promise<Notification[]> {
    return this.repository
      .createQueryBuilder('notification')
      .innerJoin(
        'notification_recipients',
        'recipient',
        'recipient.notificationId = notification.notificationId'
      )
      .where('recipient.userId = :userId', { userId })
      .andWhere('recipient.isDeleted = false')
      .orderBy('notification.createdAt', 'DESC')
      .limit(limit)
      .leftJoinAndSelect('notification.actorUser', 'actorUser')
      .getMany();
  }

  async countUnreadByUser(userId: number): Promise<number> {
    const result = await dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('notification_recipients', 'recipient')
      .where('recipient.userId = :userId', { userId })
      .andWhere('recipient.isRead = false')
      .andWhere('recipient.isDeleted = false')
      .getRawOne();
    
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Find duplicate notification by type, entity, and actor within time window
   * P1-DEDUPLICATION: Used for preventing duplicate notifications
   */
  async findDuplicate(
    notificationType: string,
    entityType: string,
    entityId: string,
    actorUserId: number | undefined,
    title: string | undefined,
    since: Date
  ): Promise<Notification | null> {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('notification.notificationType = :type', { type: notificationType })
      .andWhere('notification.entityType = :entityType', { entityType: entityType || '' })
      .andWhere('notification.entityId = :entityId', { entityId: entityId || '' })
      .andWhere('notification.actorUserId = :actorUserId', { actorUserId })
      .andWhere('notification.createdAt >= :since', { since })
      .orderBy('notification.createdAt', 'DESC');

    // Also check by title if provided
    if (title) {
      query.andWhere('notification.title = :title', { title });
    }

    return query.getOne();
  }
}
