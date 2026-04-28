import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from '../services/notification.service';
import { authenticateToken } from '../middleware/auth.middleware';
import AppDataSource from '../config/database';

const router = Router();

// Initialize dependencies
const notificationService = new NotificationService(AppDataSource);
const notificationController = new NotificationController(notificationService);

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

// Mark specific notification as seen
router.put('/:recipientId/seen', (req, res, next) => notificationController.markAsSeen(req, res, next));

// Archive notification
router.put('/:recipientId/archive', (req, res, next) => notificationController.archiveNotification(req, res, next));

// Delete notification
router.delete('/:recipientId', (req, res, next) => notificationController.deleteNotification(req, res, next));

export default router;
