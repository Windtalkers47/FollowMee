import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import dashboardController from '../controllers/dashboard.controller';

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// Get dashboard statistics
router.get('/stats', (req, res, next) => dashboardController.getDashboardStats(req, res, next));

// Get leaderboard
router.get('/leaderboard', (req, res, next) => dashboardController.getLeaderboard(req, res, next));

// Get pending tasks
router.get('/pending-tasks', (req, res, next) => dashboardController.getPendingTasks(req, res, next));

export default router;