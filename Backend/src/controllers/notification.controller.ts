import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto, NotificationQueryDto, UpdateUserNotificationSettingsDto } from '../dtos/notification.dto';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Create a new notification
   * POST /api/notifications
   */
  async createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateNotificationDto = req.body;
      const userId = req.user?.userId;

      // If no actorUserId provided, use current user
      if (!dto.actorUserId && userId) {
        dto.actorUserId = userId;
      }

      const result = await this.notificationService.createNotification(dto);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notifications for current user
   * GET /api/notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const query: NotificationQueryDto = req.query as any;
      const limit = parseInt(query.limit || '20');
      const offset = parseInt(query.offset || '0');
      const unreadOnly = query.unreadOnly === 'true';

      const result = await this.notificationService.getUserNotifications(
        userId,
        limit,
        offset,
        unreadOnly
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread count for current user
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const count = await this.notificationService.getUnreadCount(userId);
      res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark a notification as read
   * PUT /api/notifications/:notificationId/read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const notificationId = parseInt(req.params.notificationId);
      const result = await this.notificationService.markAsRead(userId, notificationId);

      if (!result) {
        res.status(404).json({ message: 'Notification not found' });
        return;
      }

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/mark-all-read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      await this.notificationService.markAllAsRead(userId);
      res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a notification (soft delete)
   * DELETE /api/notifications/:notificationId
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const notificationId = parseInt(req.params.notificationId);
      const result = await this.notificationService.deleteNotification(userId, notificationId);

      if (!result) {
        res.status(404).json({ message: 'Notification not found' });
        return;
      }

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user notification settings
   * GET /api/notifications/settings
   */
  async getUserSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const settings = await this.notificationService.getUserSettings(userId);
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user notification settings
   * PUT /api/notifications/settings
   */
  async updateUserSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const dto: UpdateUserNotificationSettingsDto = req.body;
      const settings = await this.notificationService.updateSettings(userId, dto);
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }
}
