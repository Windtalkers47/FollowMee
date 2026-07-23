import { Request, Response, NextFunction } from 'express';
import { NotificationMetricService } from '../services/notification-metric.service';
import { DataSource } from 'typeorm';
import { TrackOpenDto, TrackClickDto, AnalyticsQueryDto } from '../dtos/notification.dto';

/**
 * NotificationMetricController
 * 
 * Controller สำหรับ tracking notification analytics
 * 
 * Endpoints:
 * - POST /api/notifications/track/open - Track open event
 * - POST /api/notifications/track/click - Track click event
 * - GET /api/notifications/analytics/summary - Get analytics summary
 * - GET /api/notifications/analytics/dashboard - Get dashboard metrics (admin)
 * - GET /api/notifications/analytics/engagement - Get user engagement stats
 */
export class NotificationMetricController {
  private metricService: NotificationMetricService;

  constructor(dataSource: DataSource) {
    this.metricService = new NotificationMetricService(dataSource);
  }

  /**
   * Track open event
   * POST /api/notifications/track/open
   * 
   * Called when user opens/views a notification
   */
  async trackOpen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const { recipientId, notificationId }: TrackOpenDto = req.body;

      if (!recipientId || !notificationId) {
        res.status(400).json({ 
          message: 'recipientId and notificationId are required' 
        });
        return;
      }

      // Get user agent and IP from request
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;
      const sessionId = req.headers['x-session-id'] as string | undefined;

      // Track the open event
      const metric = await this.metricService.trackOpen(
        recipientId,
        userId,
        notificationId,
        userAgent,
        ipAddress,
        sessionId
      );

      res.status(200).json({
        success: true,
        message: 'Open event tracked',
        data: {
          metricId: metric.metricId,
          openedAt: metric.openedAt,
          deviceType: metric.deviceType,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track click event
   * POST /api/notifications/track/click
   * 
   * Called when user clicks on notification actionUrl
   */
  async trackClick(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const { recipientId }: TrackClickDto = req.body;

      if (!recipientId) {
        res.status(400).json({ 
          message: 'recipientId is required' 
        });
        return;
      }

      // Track the click event
      const metric = await this.metricService.trackClick(recipientId, userId);

      if (!metric) {
        res.status(404).json({
          success: false,
          message: 'Metric not found. Track open event first.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Click event tracked',
        data: {
          metricId: metric.metricId,
          clickedAt: metric.clickedAt,
          timeToClick: metric.getTimeToClick(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get analytics summary
   * GET /api/notifications/analytics/summary
   * 
   * Quick summary stats for current user
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      
      const stats = await this.metricService.getUserEngagementStats(userId, days);

      res.status(200).json({
        success: true,
        data: {
          period: `${days} days`,
          ...stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard metrics
   * GET /api/notifications/analytics/dashboard
   * 
   * Full dashboard metrics for admin
   * Requires admin role (should add middleware)
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Add admin role check middleware
      // const isAdmin = req.user?.role === 'admin';
      // if (!isAdmin) {
      //   res.status(403).json({ message: 'Admin access required' });
      //   return;
      // }

      const { startDate, endDate, notificationId, userId }: AnalyticsQueryDto = req.query;

      const query: any = {};
      
      if (startDate) {
        query.startDate = new Date(startDate);
      }
      if (endDate) {
        query.endDate = new Date(endDate);
      }
      if (notificationId) {
        query.notificationId = parseInt(notificationId as any);
      }
      if (userId) {
        query.userId = parseInt(userId as any);
      }

      const metrics = await this.metricService.getDashboardMetrics(query);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get engagement stats for specific user
   * GET /api/notifications/analytics/engagement/:userId
   * 
   * For admin to view user engagement
   */
  async getUserEngagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Add admin role check middleware
      const targetUserId = parseInt(req.params.userId);
      
      if (!targetUserId) {
        res.status(400).json({ message: 'userId is required' });
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      
      const stats = await this.metricService.getUserEngagementStats(targetUserId, days);

      res.status(200).json({
        success: true,
        data: {
          userId: targetUserId,
          period: `${days} days`,
          ...stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get metrics for specific notification
   * GET /api/notifications/analytics/notification/:notificationId
   * 
   * View detailed metrics for a notification
   */
  async getNotificationMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notificationId = parseInt(req.params.notificationId);
      
      if (!notificationId) {
        res.status(400).json({ message: 'notificationId is required' });
        return;
      }

      const [metrics, openRate, ctr] = await Promise.all([
        this.metricService.getNotificationMetrics(notificationId),
        this.metricService.getOpenRate(notificationId),
        this.metricService.getClickThroughRate(notificationId),
      ]);

      res.status(200).json({
        success: true,
        data: {
          notificationId,
          metrics,
          openRate: Math.round(openRate * 100) / 100,
          clickThroughRate: Math.round(ctr * 100) / 100,
          totalRecipients: metrics.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quick summary stats
   * GET /api/notifications/analytics/quick-summary
   * 
   * Lightweight endpoint for caching
   */
  async getQuickSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await this.metricService.getQuickSummary();

      res.status(200).json({
        success: true,
        data: summary,
        cached: false, // Set to true if implementing caching
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cleanup old metrics (admin only)
   * POST /api/notifications/analytics/cleanup
   * 
   * Delete metrics older than specified days
   */
  async cleanupOldMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Add admin role check middleware
      const daysToKeep = parseInt(req.body.daysToKeep) || 90;

      const deletedCount = await this.metricService.cleanupOldMetrics(daysToKeep);

      res.status(200).json({
        success: true,
        message: `Cleaned up ${deletedCount} old metrics`,
        data: {
          deletedCount,
          daysToKeep,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}