import { DataSource, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Notification } from '../entities/Notification';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor(repository?: Repository<Notification>) {
    super(Notification, repository);
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
    // This will need to join with notification_recipients
    // For now, we'll implement a simpler version
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
    const dataSource = this.dataSource;
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
}
