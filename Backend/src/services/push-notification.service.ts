import webpush from 'web-push';
import { UserNotificationSettings } from '../entities/UserNotificationSettings';
import { pushSubscriptionRepository } from '../repositories/push-subscription.repository';
import { PushSubscription as PushSubscriptionEntity } from '../entities/PushSubscription';

/**
 * Push Notification Service (NEW-PUSH: Firebase Cloud Messaging / Web Push)
 * 
 * Cost: Free (Firebase FCM free tier - unlimited for most use cases)
 * 
 * Features:
 * - Browser push notifications
 * - Service Worker integration
 * - VAPID keys for authentication
 * - Database persistence for subscriptions
 */

interface WebPushSubscription {
  endpoint: string;
  expirationTime?: string | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    notificationId?: number;
    type?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

class PushNotificationService {
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private isConfigured: boolean = false;
  private contactEmail: string = '';

  constructor() {
    this.initializeVapidKeys();
  }

  /**
   * Initialize VAPID keys for Web Push
   */
  private initializeVapidKeys(): void {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    this.contactEmail = process.env.VAPID_CONTACT_EMAIL || 'noreply@followmee.com';

    if (vapidPublicKey && vapidPrivateKey) {
      this.vapidKeys = {
        publicKey: vapidPublicKey,
        privateKey: vapidPrivateKey,
      };
      webpush.setVapidDetails(this.contactEmail, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
      console.log('[PushNotification] Web Push configured with VAPID keys');
    } else {
      console.warn('[PushNotification] VAPID keys not configured. Push notifications disabled.');
      this.isConfigured = false;
    }
  }

  /**
   * Generate new VAPID keys (run once to get keys, then save to .env)
   */
  static generateVapidKeys(): { publicKey: string; privateKey: string } {
    return webpush.generateVAPIDKeys();
  }

  /**
   * Check if push notification is available
   */
  isAvailable(): boolean {
    return this.isConfigured && this.vapidKeys !== null;
  }

  /**
   * Get VAPID public key (for frontend subscription)
   */
  getVapidPublicKey(): string | null {
    return this.vapidKeys?.publicKey || null;
  }

  /**
   * Send push notification to a single subscription
   */
  async sendPush(
    subscription: WebPushSubscription,
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Push notification not configured' };
    }

    try {
      const payloadString = JSON.stringify(payload);

      await webpush.sendNotification(subscription, payloadString);

      console.log(`[PushNotification] Push sent to ${subscription.endpoint}`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for subscription errors
      if (error instanceof webpush.WebPushError) {
        if (error.statusCode === 410) {
          // Subscription expired, should be removed from database
          console.log(`[PushNotification] Subscription expired (410): ${subscription.endpoint}`);
          return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
        }
      }

      console.error(`[PushNotification] Failed to send push:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send push notification for new notification event
   */
  async sendNotificationPush(
    subscription: WebPushSubscription,
    notification: {
      title: string;
      message: string;
      type: string;
      notificationId?: number;
      actionUrl?: string;
    },
    settings?: UserNotificationSettings | null
  ): Promise<{ success: boolean; error?: string }> {
    // Check if user has push enabled in settings
    if (settings && !settings.pushEnabled) {
      console.log('[PushNotification] User has push disabled');
      return { success: false, error: 'PUSH_DISABLED' };
    }

    const payload: PushNotificationPayload = {
      title: notification.title,
      body: notification.message,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: {
        url: notification.actionUrl || '/notifications',
        notificationId: notification.notificationId,
        type: notification.type,
      },
      tag: `notification-${notification.notificationId || Date.now()}`,
      requireInteraction: false,
    };

    return this.sendPush(subscription, payload);
  }

  /**
   * Send batch push notifications
   */
  async sendBatchPush(
    subscriptions: WebPushSubscription[],
    payload: PushNotificationPayload
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    expired: number;
  }> {
    const results = {
      total: subscriptions.length,
      success: 0,
      failed: 0,
      expired: 0,
    };

    const pushPromises = subscriptions.map(async (sub) => {
      const result = await this.sendPush(sub, payload);
      if (result.success) {
        results.success++;
      } else if (result.error === 'SUBSCRIPTION_EXPIRED') {
        results.expired++;
      } else {
        results.failed++;
      }
    });

    await Promise.all(pushPromises);

    return results;
  }

  /**
   * Get all active subscriptions for a user
   */
  async getSubscriptionsForUser(userId: number): Promise<PushSubscriptionEntity[]> {
    return pushSubscriptionRepository.findByUserId(userId);
  }

  /**
   * Save or update subscription (with deduplication)
   */
  async saveSubscription(
    userId: number,
    endpoint: string,
    p256dh: string,
    auth: string,
    expirationTime: Date | null,
    deviceName: string | null = null
  ): Promise<PushSubscriptionEntity> {
    return pushSubscriptionRepository.upsertSubscription(
      userId,
      endpoint,
      p256dh,
      auth,
      expirationTime,
      deviceName
    );
  }

  /**
   * Unsubscribe by endpoint
   */
  async unsubscribe(endpoint: string): Promise<boolean> {
    return pushSubscriptionRepository.deactivateByEndpoint(endpoint);
  }

  /**
   * Cleanup expired subscriptions and return count
   */
  async cleanupExpiredSubscriptions(): Promise<number> {
    return pushSubscriptionRepository.cleanupExpired();
  }

  /**
   * Handle expired subscription (called when 410 error received)
   */
  async handleExpiredSubscription(endpoint: string): Promise<void> {
    console.log(`[PushNotification] Handling expired subscription: ${endpoint}`);
    await pushSubscriptionRepository.deactivateByEndpoint(endpoint);
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();
