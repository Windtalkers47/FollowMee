import { Repository } from 'typeorm';
import dataSource from '../config/database';
import { PushSubscription } from '../entities/PushSubscription';

/**
 * PushSubscription Repository
 * Handles database operations for push subscriptions
 */
export class PushSubscriptionRepository {
  private repository: Repository<PushSubscription>;

  constructor() {
    this.repository = dataSource.getRepository(PushSubscription);
  }

  /**
   * Find active subscription by endpoint (for deduplication)
   */
  async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    return this.repository.findOne({
      where: {
        endpoint,
        isActive: true,
      },
    });
  }

  /**
   * Find all active subscriptions for a user
   */
  async findByUserId(userId: number): Promise<PushSubscription[]> {
    return this.repository.find({
      where: {
        userId,
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Upsert subscription (for duplicate prevention)
   * If endpoint exists, update it. Otherwise, create new.
   */
  async upsertSubscription(
    userId: number,
    endpoint: string,
    p256dh: string,
    auth: string,
    expirationTime: Date | null,
    deviceName: string | null
  ): Promise<PushSubscription> {
    // Check if subscription with same endpoint exists
    const existing = await this.findByEndpoint(endpoint);

    if (existing) {
      // Update existing subscription
      existing.p256dh = p256dh;
      existing.auth = auth;
      existing.expirationTime = expirationTime;
      existing.deviceName = deviceName;
      existing.isActive = true;
      return this.repository.save(existing);
    }

    // Deactivate old subscriptions for same user (keep only latest per device)
    // This allows multiple devices but prevents duplicate subscriptions per device
    await this.repository.update(
      { userId, isActive: true },
      { isActive: false }
    );

    // Create new subscription
    const subscription = this.repository.create({
      userId,
      endpoint,
      p256dh,
      auth,
      expirationTime,
      deviceName,
      isActive: true,
    });

    return this.repository.save(subscription);
  }

  /**
   * Deactivate subscription by endpoint
   */
  async deactivateByEndpoint(endpoint: string): Promise<boolean> {
    const result = await this.repository.update(
      { endpoint, isActive: true },
      { isActive: false }
    );
    return (result.affected || 0) > 0;
  }

  /**
   * Deactivate subscription by ID
   */
  async deactivateById(subscriptionId: number): Promise<boolean> {
    const result = await this.repository.update(subscriptionId, { isActive: false });
    return (result.affected || 0) > 0;
  }

  /**
   * Get all active subscriptions
   */
  async findAllActive(): Promise<PushSubscription[]> {
    return this.repository.find({
      where: {
        isActive: true,
      },
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Cleanup expired subscriptions
   * Returns count of deactivated subscriptions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.repository.createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('expirationTime IS NOT NULL')
      .andWhere('expirationTime < :now', { now: new Date() })
      .andWhere('isActive = :active', { active: true })
      .execute();

    return result.affected || 0;
  }
}

// Singleton instance
export const pushSubscriptionRepository = new PushSubscriptionRepository();