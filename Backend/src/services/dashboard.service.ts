import { Repository, MoreThanOrEqual, LessThan, Between, In } from 'typeorm';
import AppDataSource from '../config/database';
import { Customer } from '../entities/Customer';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import {
  CustomerStats,
  TaskStats,
  UserRankInfo,
  LeaderboardResponse,
  LeaderboardItem,
  DashboardStatsResponse,
  PendingTasksResponse,
  PendingTaskItem,
} from '../dtos/dashboard.dto';

// Time Range type for dashboard stats
export type TimeRange = '1d' | '5d' | '7d' | '1m' | '3m' | '6m' | 'ytd' | '1y' | '5y';

// Helper function to get date range based on time range
export const getDateRange = (range: TimeRange): { days: number; startDate: Date } => {
  const now = new Date();
  let days: number;
  
  switch (range) {
    case '1d':
      days = 1;
      break;
    case '5d':
      days = 5;
      break;
    case '7d':
      days = 7;
      break;
    case '1m':
      days = 30;
      break;
    case '3m':
      days = 90;
      break;
    case '6m':
      days = 180;
      break;
    case 'ytd':
      // Year-to-Date: from start of current year
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      return { days, startDate: startOfYear };
    case '1y':
      days = 365;
      break;
    case '5y':
      days = 365 * 5;
      break;
    default:
      days = 1;
  }
  
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { days, startDate };
};

export class DashboardService {
  private customerRepository: Repository<Customer>;
  private taskRepository: Repository<Task>;
  private userRepository: Repository<User>;

  constructor() {
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.taskRepository = AppDataSource.getRepository(Task);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Get customer statistics with time range support
   */
  async getCustomerStats(range: TimeRange = '7d'): Promise<CustomerStats> {
    const now = new Date();
    const { days, startDate } = getDateRange(range);
    
    // Get total customers by status
    const totalCustomers = await this.customerRepository.count({
      where: { isActive: true }
    });

    const activeCustomers = await this.customerRepository.count({
      where: { isActive: true, status: 'active' }
    });

    const inactiveCustomers = await this.customerRepository.count({
      where: { isActive: true, status: 'inactive' }
    });

    const newInRange = await this.customerRepository.count({
      where: { isActive: true, createdAt: MoreThanOrEqual(startDate) }
    });

    // Get customer trend for the specified range
    const customerTrend: { date: string; active: number; inactive: number; new: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const [active, inactive, newCustomers] = await Promise.all([
        this.customerRepository.count({
          where: {
            isActive: true,
            status: 'active',
            createdAt: LessThan(nextDate)
          }
        }),
        this.customerRepository.count({
          where: {
            isActive: true,
            status: 'inactive',
            createdAt: LessThan(nextDate)
          }
        }),
        this.customerRepository.count({
          where: {
            isActive: true,
            createdAt: Between(date, nextDate)
          }
        })
      ]);

      customerTrend.push({ date: dateStr, active, inactive, new: newCustomers });
    }

    return {
      totalCustomers,
      customersByStatus: {
        active: activeCustomers,
        inactive: inactiveCustomers,
        newThisWeek: newInRange
      },
      customerTrend
    };
  }

  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<TaskStats> {
    const now = new Date();

    const grouped = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.taskId)', 'count')
      .where('task.isActive = :active', { active: true })
      .groupBy('task.status')
      .getRawMany<{ status: string; count: string }>();
    const countByStatus = (status: string) => Number(grouped.find(row => row.status === status)?.count || 0);
    const draftCount = countByStatus('draft');
    const todoCount = countByStatus('todo');
    const inProgressCount = countByStatus('in_progress');
    const reviewCount = countByStatus('review');
    const doneCount = countByStatus('done');
    const cancelledCount = countByStatus('cancelled');

    const totalTasks = draftCount + todoCount + inProgressCount + reviewCount + doneCount + cancelledCount;
    const pendingTasks = todoCount + inProgressCount + reviewCount;
    
    const completionRate = totalTasks > 0 
      ? Math.round(((doneCount) / totalTasks) * 100) 
      : 0;

    // Get task trend for last 7 days
    const taskTrend: { date: string; completed: number; pending: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const [completed, pending] = await Promise.all([
        this.taskRepository.count({
          where: {
            isActive: true,
            status: 'done',
            updatedAt: Between(date, nextDate)
          }
        }),
        this.taskRepository.count({
          where: {
            isActive: true,
            status: In(['todo', 'in_progress', 'review']),
            createdAt: LessThan(nextDate)
          }
        })
      ]);

      taskTrend.push({ date: dateStr, completed, pending });
    }

    return {
      pendingTasks,
      totalTasks,
      completionRate,
      tasksByStatus: {
        draft: draftCount,
        todo: todoCount,
        in_progress: inProgressCount,
        review: reviewCount,
        done: doneCount,
        cancelled: cancelledCount
      },
      taskTrend
    };
  }

  /**
   * Get user rank information
   */
  async getUserRank(userId: number): Promise<UserRankInfo> {
    // Get all users with their completed task counts
    const userStats = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('tasks', 't', 't.assignedTo = user.userId AND t.status = :status AND t.isActive = :isActive', { status: 'done', isActive: true })
      .select('user.userId', 'userId')
      .addSelect('user.userName', 'userName')
      .addSelect('user.userLastName', 'userLastName')
      .addSelect('user.userImageUrl', 'userImageUrl')
      .addSelect('COUNT(DISTINCT t.taskId)', 'completedTasks')
      .addSelect('COALESCE(SUM(t.completionScore), 0)', 'score')
      .addSelect('SUM(CASE WHEN t.dueDate IS NOT NULL AND t.completedAt <= t.dueDate THEN 1 ELSE 0 END)', 'onTimeTasks')
      .addSelect('SUM(CASE WHEN t.reopenedCount = 0 THEN 1 ELSE 0 END)', 'firstPassTasks')
      .addSelect('MAX(t.completedAt)', 'lastScoredAt')
      .addSelect('(SELECT COUNT(*) FROM tasks t_active WHERE t_active.assignedTo = user.userId AND t_active.isActive = 1)', 'totalTasks')
      .where('user.isActive = :isActive', { isActive: true })
      .groupBy('user.userId')
      .orderBy('score', 'DESC')
      .addOrderBy('onTimeTasks', 'DESC')
      .addOrderBy('firstPassTasks', 'DESC')
      .addOrderBy('lastScoredAt', 'ASC')
      .getRawMany();

    const totalUsers = userStats.length;
    
    // Find current user's position
    const userIndex = userStats.findIndex(stat => parseInt(stat.userId) === userId);
    
    if (userIndex === -1) {
      // User not found, return default
      return {
        rank: 1,
        score: 0,
        nextRankScore: null,
        prevRankScore: null,
        completedTasks: 0,
        totalUsers: 1,
        progressToNext: 0
      };
    }

    const rank = userIndex + 1;
    const completedTasks = parseInt(userStats[userIndex].completedTasks) || 0;
    const score = parseInt(userStats[userIndex].score) || 0;

    // Get next and previous rank scores
    const nextRankScore = userIndex > 0 ? parseInt(userStats[userIndex - 1].score) : null;
    const prevRankScore = userIndex < userStats.length - 1 ? parseInt(userStats[userIndex + 1].score) : null;

    // Calculate progress to next rank
    let progressToNext = 0;
    if (nextRankScore !== null && nextRankScore > score) {
      const prevScore = prevRankScore || 0;
      const range = nextRankScore - prevScore;
      const current = score - prevScore;
      progressToNext = range > 0 ? Math.round((current / range) * 100) : 100;
    } else if (nextRankScore === null) {
      progressToNext = 100; // Top rank
    } else {
      progressToNext = 100; // Already at or above next rank
    }

    return {
      rank,
      score,
      nextRankScore,
      prevRankScore,
      completedTasks,
      totalUsers,
      progressToNext
    };
  }

  /**
   * Get leaderboard with top performers
   */
  async getLeaderboard(limit: number = 5): Promise<LeaderboardResponse> {
    const myRank = await this.getUserRank(0); // Will be updated with actual userId in controller

    // Get top performers
    const topPerformersRaw = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('tasks', 't', 't.assignedTo = user.userId AND t.status = :status AND t.isActive = :isActive', { status: 'done', isActive: true })
      .select('user.userId', 'userId')
      .addSelect('user.userName', 'userName')
      .addSelect('user.userLastName', 'userLastName')
      .addSelect('user.userImageUrl', 'userImageUrl')
      .addSelect('COUNT(DISTINCT t.taskId)', 'completedTasks')
      .addSelect('COALESCE(SUM(t.completionScore), 0)', 'score')
      .addSelect('SUM(CASE WHEN t.dueDate IS NOT NULL AND t.completedAt <= t.dueDate THEN 1 ELSE 0 END)', 'onTimeTasks')
      .addSelect('SUM(CASE WHEN t.reopenedCount = 0 THEN 1 ELSE 0 END)', 'firstPassTasks')
      .addSelect('MAX(t.completedAt)', 'lastScoredAt')
      .where('user.isActive = :isActive', { isActive: true })
      .groupBy('user.userId')
      .orderBy('score', 'DESC')
      .addOrderBy('onTimeTasks', 'DESC')
      .addOrderBy('firstPassTasks', 'DESC')
      .addOrderBy('lastScoredAt', 'ASC')
      .limit(limit)
      .getRawMany();

    const topPerformers: LeaderboardItem[] = topPerformersRaw.map((stat, index) => ({
      rank: index + 1,
      userId: parseInt(stat.userId),
      userName: stat.userName || 'Unknown',
      userLastName: stat.userLastName || 'User',
      userImageUrl: stat.userImageUrl || undefined,
      completedTasks: parseInt(stat.completedTasks) || 0,
      score: parseInt(stat.score) || 0
    }));

    return {
      myRank,
      topPerformers
    };
  }

  /**
   * Get pending tasks that need attention
   */
  async getPendingTasks(userId: number, limit: number = 5): Promise<PendingTasksResponse> {
    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdByUser', 'createdByUser')
      .leftJoinAndSelect('task.assignedToUser', 'assignedToUser')
      .where('task.isActive = :isActive', { isActive: true })
      .andWhere('task.status IN (:...statuses)', { statuses: ['todo', 'in_progress', 'review'] })
      .andWhere('(task.createdBy = :userId OR task.assignedTo = :userId)', { userId })
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.createdAt', 'ASC')
      .take(limit)
      .getMany();

    const total = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.isActive = :isActive', { isActive: true })
      .andWhere('task.status IN (:...statuses)', { statuses: ['todo', 'in_progress', 'review'] })
      .andWhere('(task.createdBy = :userId OR task.assignedTo = :userId)', { userId })
      .getCount();

    const pendingTaskItems: PendingTaskItem[] = tasks.map(task => {
      let priority: 'high' | 'medium' | 'low' = 'medium';
      
      if (task.dueDate) {
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          priority = 'high'; // Overdue
        } else if (daysUntilDue <= 2) {
          priority = 'high';
        } else if (daysUntilDue <= 5) {
          priority = 'medium';
        } else {
          priority = 'low';
        }
      }

      return {
        taskId: task.taskId,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate || undefined,
        priority,
        assignedTo: task.assignedTo || undefined,
        createdBy: task.createdBy || undefined
      };
    });

    return {
      tasks: pendingTaskItems,
      total
    };
  }

  /**
   * Get combined dashboard stats with time range support
   */
  async getDashboardStats(userId: number, range: TimeRange = '7d'): Promise<DashboardStatsResponse> {
    const [customerStats, taskStats, userRank] = await Promise.all([
      this.getCustomerStats(range),
      this.getTaskStats(),
      this.getUserRank(userId)
    ]);

    return {
      customerStats,
      taskStats,
      userRank
    };
  }
}

export default new DashboardService();
