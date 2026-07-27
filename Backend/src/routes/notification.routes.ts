import { Router, Request, Response } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationMetricController } from '../controllers/notification-metric.controller';
import { NotificationService } from '../services/notification.service';
import { notificationQueueService } from '../services/notification-queue.service';
import { notificationCleanupService } from '../services/notification-cleanup.service';
import { emailService } from '../services/email.service';
import { pushNotificationService } from '../services/push-notification.service';
import { authenticateToken } from '../middleware/auth.middleware';
import AppDataSource from '../config/database';

const router = Router();

// Initialize dependencies
const notificationService = new NotificationService(AppDataSource);
const notificationController = new NotificationController(notificationService);
const metricController = new NotificationMetricController(AppDataSource);

// All notification routes require authentication
router.use(authenticateToken);

// Create a new notification
router.post('/', (req, res, next) => notificationController.createNotification(req, res, next));

// Get notifications for current user
router.get('/', (req, res, next) => notificationController.getNotifications(req, res, next));

// Get unread count
router.get('/unread-count', (req, res, next) => notificationController.getUnreadCount(req, res, next));

// Mark all as read
router.put('/mark-all-read', (req, res, next) => notificationController.markAllAsRead(req, res, next));

// Get user settings
router.get('/settings', (req, res, next) => notificationController.getUserSettings(req, res, next));

// Update user settings
router.put('/settings', (req, res, next) => notificationController.updateUserSettings(req, res, next));

// Mark specific notification as read
router.put('/:recipientId/read', (req, res, next) => notificationController.markAsRead(req, res, next));
router.put('/:recipientId/unread', (req, res, next) => notificationController.markAsUnread(req, res, next));
router.put('/:recipientId/seen', (req, res, next) => notificationController.markAsSeen(req, res, next));
router.put('/:recipientId/archive', (req, res, next) => notificationController.archiveNotification(req, res, next));
router.put('/:recipientId/restore', (req, res, next) => notificationController.restoreNotification(req, res, next));

// Delete notification (soft delete)
router.delete('/:recipientId', (req, res, next) => notificationController.deleteNotification(req, res, next));

// Monitoring endpoint for queue stats (W2-RATE-LIMIT: Monitoring)
router.get('/queue/stats', async (req, res, next) => {
  try {
    const [queueSize, timerCount, cleanupStats] = await Promise.all([
      notificationQueueService.getQueueSize(),
      notificationQueueService.getTimerCount(),
      notificationCleanupService.getStats().catch(() => null),
    ]);

    res.json({
      queue: {
        size: queueSize,
        pendingTimers: timerCount,
      },
      cleanup: cleanupStats || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Email usage endpoint (NEW-EMAIL-QUEUE: Cost monitoring)
router.get('/email/usage', async (req, res, next) => {
  try {
    const emailUsage = emailService.getEmailUsage();
    res.json({
      email: emailUsage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Push Notification endpoints (NEW-PUSH: Browser Push)
// Get VAPID public key for subscription
router.get('/push/vapid-key', (req, res, next) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    if (!publicKey) {
      return res.status(503).json({
        success: false,
        message: 'Push notification not configured',
      });
    }
    res.json({
      success: true,
      publicKey,
    });
  } catch (error) {
    next(error);
  }
});

// Subscribe to push notifications
router.post('/push/subscribe', authenticateToken, async (req, res, next) => {
  try {
    const requestBody = req.body as { 
      subscription: {
        endpoint: string;
        expirationTime?: string | null;
        keys: {
          p256dh: string;
          auth: string;
        };
      };
      deviceName?: string;
    };
    const { subscription, deviceName } = requestBody;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data',
      });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found',
      });
    }

    // Save or update subscription (with deduplication)
    const savedSubscription = await pushNotificationService.saveSubscription(
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      subscription.expirationTime ? new Date(subscription.expirationTime) : null,
      deviceName || null
    );

    console.log(`[Push] Subscription saved for user ${userId}: ${subscription.endpoint}`);
    
    res.json({
      success: true,
      message: 'Subscription saved',
      subscriptionId: savedSubscription.subscriptionId,
    });
  } catch (error) {
    next(error);
  }
});

// Unsubscribe from push notifications
router.post('/push/unsubscribe', authenticateToken, async (req, res, next) => {
  try {
    const { endpoint } = req.body as { endpoint?: string };
    
    if (endpoint) {
      // Unsubscribe specific endpoint
      const success = await pushNotificationService.unsubscribe(endpoint);
      console.log(`[Push] Unsubscribe endpoint: ${endpoint}, success: ${success}`);
      
      res.json({
        success: true,
        message: success ? 'Unsubscribed' : 'Subscription not found',
      });
    } else {
      // Unsubscribe all for current user
      // For now, just acknowledge
      console.log('[Push] Unsubscribe all for user:', req.user?.userId);
      
      res.json({
        success: true,
        message: 'Unsubscribe request received',
      });
    }
  } catch (error) {
    next(error);
  }
});

// Check if push is available
router.get('/push/available', (req, res, next) => {
  try {
    const available = pushNotificationService.isAvailable();
    res.json({
      available,
      configured: available,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// W5-METRICS: Analytics & Tracking Routes
// ============================================

// Track open event (when user views notification)
router.post('/track/open', authenticateToken, (req, res, next) => 
  metricController.trackOpen(req, res, next)
);

// Track click event (when user clicks actionUrl)
router.post('/track/click', authenticateToken, (req, res, next) => 
  metricController.trackClick(req, res, next)
);

// Get user's own analytics summary
router.get('/analytics/summary', authenticateToken, (req, res, next) => 
  metricController.getSummary(req, res, next)
);

// Get dashboard metrics (admin only - TODO: add admin middleware)
router.get('/analytics/dashboard', authenticateToken, (req, res, next) => 
  metricController.getDashboard(req, res, next)
);

// Get engagement stats for specific user (admin only)
router.get('/analytics/engagement/:userId', authenticateToken, (req, res, next) => 
  metricController.getUserEngagement(req, res, next)
);

// Get metrics for specific notification
router.get('/analytics/notification/:notificationId', authenticateToken, (req, res, next) => 
  metricController.getNotificationMetrics(req, res, next)
);

// Get quick summary stats (lightweight, cacheable)
router.get('/analytics/quick-summary', authenticateToken, (req, res, next) => 
  metricController.getQuickSummary(req, res, next)
);

// Cleanup old metrics (admin only)
router.post('/analytics/cleanup', authenticateToken, (req, res, next) => 
  metricController.cleanupOldMetrics(req, res, next)
);

export default router;
