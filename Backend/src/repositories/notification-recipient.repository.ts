import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { NotificationRecipient } from '../entities/NotificationRecipient';

export class NotificationRecipientRepository extends BaseRepository<NotificationRecipient> {
  constructor() {
    super(NotificationRecipient);
  }

  async findByUserWithNotification(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    view: 'active' | 'archived' = 'active',
    unreadOnly: boolean = false
  ): Promise<NotificationRecipient[]> {
    const query = this.repository
      .createQueryBuilder('recipient')
      .leftJoinAndSelect('recipient.notification', 'notification')
      .leftJoinAndSelect('notification.actorUser', 'actorUser')
      .where('recipient.userId = :userId', { userId })
      .andWhere('recipient.isDeleted = false')
      .andWhere('recipient.isArchived = :isArchived', { isArchived: view === 'archived' })
      .orderBy('notification.createdAt', 'DESC')
      .take(limit)
      .skip(offset);
    if (unreadOnly) query.andWhere('recipient.isRead = false');
    return query.getMany();
  }

  async countByUser(
    userId: number,
    view: 'active' | 'archived' = 'active',
    unreadOnly: boolean = false
  ): Promise<number> {
    const query = this.repository
      .createQueryBuilder('recipient')
      .where('recipient.userId = :userId', { userId })
      .andWhere('recipient.isDeleted = false')
      .andWhere('recipient.isArchived = :isArchived', { isArchived: view === 'archived' });
    if (unreadOnly) query.andWhere('recipient.isRead = false');
    return query.getCount();
  }

  async findUnreadByUser(userId: number, limit: number = 20): Promise<NotificationRecipient[]> {
    return this.repository.find({
      where: { userId, isRead: false, isDeleted: false, isArchived: false },
      relations: ['notification', 'notification.actorUser'],
      order: { notification: { createdAt: 'DESC' } },
      take: limit,
    });
  }

  async findByUserAndNotification(userId: number, notificationId: number): Promise<NotificationRecipient | null> {
    return this.repository.findOne({
      where: { userId, notificationId },
      relations: ['notification'],
    });
  }

  async findOwnedRecipient(userId: number, recipientId: number): Promise<NotificationRecipient | null> {
    return this.repository.findOne({
      where: { userId, recipientId },
      relations: ['notification', 'notification.actorUser'],
    });
  }

  async markAsRead(recipientId: number): Promise<NotificationRecipient | null> {
    const recipient = await this.repository.findOne({ where: { recipientId } });
    if (!recipient) return null;

    recipient.isRead = true;
    recipient.readAt = new Date();
    return this.repository.save(recipient);
  }

  async markAsUnread(recipientId: number): Promise<NotificationRecipient | null> {
    const recipient = await this.repository.findOne({ where: { recipientId } });
    if (!recipient) return null;
    recipient.isRead = false;
    recipient.readAt = undefined;
    return this.repository.save(recipient);
  }

  async markAsSeen(recipientId: number): Promise<NotificationRecipient | null> {
    const recipient = await this.repository.findOne({ where: { recipientId } });
    if (!recipient) return null;

    recipient.isSeen = true;
    recipient.seenAt = new Date();
    return this.repository.save(recipient);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(NotificationRecipient)
      .set({ isRead: true, readAt: () => 'CURRENT_TIMESTAMP' })
      .where('userId = :userId', { userId })
      .andWhere('isRead = false')
      .andWhere('isDeleted = false')
      .andWhere('isArchived = false')
      .execute();
  }

  async archive(recipientId: number): Promise<NotificationRecipient | null> {
    const recipient = await this.repository.findOne({ where: { recipientId } });
    if (!recipient) return null;

    recipient.isArchived = true;
    recipient.archivedAt = new Date();
    return this.repository.save(recipient);
  }

  async restore(recipientId: number): Promise<NotificationRecipient | null> {
    const recipient = await this.repository.findOne({ where: { recipientId } });
    if (!recipient) return null;
    recipient.isArchived = false;
    recipient.archivedAt = undefined;
    return this.repository.save(recipient);
  }

  async deleteForUser(recipientId: number): Promise<NotificationRecipient | null> {
    const recipient = await this.repository.findOne({ where: { recipientId } });
    if (!recipient) return null;

    recipient.isDeleted = true;
    recipient.deletedAt = new Date();
    return this.repository.save(recipient);
  }

  /**
   * Get the underlying TypeORM repository (for cleanup service)
   */
  getRepository(): Repository<NotificationRecipient> {
    return this.repository;
  }
}
