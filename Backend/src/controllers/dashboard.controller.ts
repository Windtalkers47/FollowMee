import { Request, Response, NextFunction } from 'express';
import { DashboardService, TimeRange } from '../services/dashboard.service';

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get dashboard statistics
   * GET /api/dashboard/stats?range=1d|5d|7d|1m|3m|6m|ytd|1y|5y
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const range = req.query.range as TimeRange || '1d';
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const stats = await this.dashboardService.getDashboardStats(userId, range);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const range = (req.query.range as TimeRange) || '1d';
      const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
      res.status(200).json({ success: true, data: await this.dashboardService.getOverview(userId, range, limit) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leaderboard
   * GET /api/dashboard/leaderboard
   */
  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const limit = parseInt(req.query.limit as string) || 5;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const leaderboard = await this.dashboardService.getLeaderboard(limit);
      
      // Update myRank with actual user data
      const actualMyRank = await this.dashboardService.getUserRank(userId);
      leaderboard.myRank = actualMyRank;

      res.status(200).json({ success: true, data: leaderboard });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending tasks
   * GET /api/dashboard/pending-tasks
   */
  async getPendingTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const limit = parseInt(req.query.limit as string) || 5;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const pendingTasks = await this.dashboardService.getPendingTasks(userId, limit);
      res.status(200).json({ success: true, data: pendingTasks });
    } catch (error) {
      next(error);
    }
  }
}

export default new DashboardController(new DashboardService());
