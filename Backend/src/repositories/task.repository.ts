import { Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { BaseRepository } from './base.repository';
import { TaskQueryDto } from '../dtos/task.dto';

export class TaskRepository extends BaseRepository<Task> {
  constructor(repository?: Repository<Task>) {
    super(Task, repository);
  }

  async findById(id: string): Promise<Task | null> {
    return this.repository.findOne({ where: { taskId: id, isActive: true } });
  }

  async findTasksWithRelations(query: TaskQueryDto): Promise<[Task[], number]> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedToUser', 'assignedUser')
      .leftJoinAndSelect('task.createdByUser', 'createdUser')
      .leftJoin('task.likes', 'like')
      .leftJoin('task.comments', 'comment')
      .where('task.isActive = :isActive', { isActive: true });

    // Search functionality - only search when explicitly requested
    if (query.search && !query.clearSearch) {
      qb.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${query.search}%` }
      );
    }
    
    // Clear search functionality - fetch all when clearSearch is true
    if (query.clearSearch) {
      // Don't add any search filters - fetch all active tasks
    }

    // Status filter
    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    // Assigned to filter
    if (query.assignedTo) {
      qb.andWhere('task.assignedTo = :assignedTo', { assignedTo: query.assignedTo });
    }

    // Created by filter
    if (query.createdBy) {
      qb.andWhere('task.createdBy = :createdBy', { createdBy: query.createdBy });
    }

    // Add counts
    qb.addSelect('COUNT(DISTINCT like.likeId)', 'likeCount')
      .addSelect('COUNT(DISTINCT comment.commentId)', 'commentCount')
      .groupBy('task.taskId')
      .addGroupBy('assignedUser.userId')
      .addGroupBy('createdUser.userId');
    
    // Performance stats - only when requested
    if (query.includeStats) {
      qb.addSelect('COUNT(CASE WHEN task.status = :doneStatus THEN 1 END)', 'completedTasks')
        .orderBy('completedTasks', 'DESC')
        .setParameter('doneStatus', 'done');
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    qb.skip(offset).take(limit);

    // Order by creation date (newest first)
    qb.orderBy('task.createdAt', 'DESC');

    return qb.getManyAndCount();
  }

  async findTaskByIdWithRelations(taskId: string): Promise<Task | null> {
    return this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedToUser', 'assignedUser')
      .leftJoinAndSelect('task.createdByUser', 'createdUser')
      .leftJoinAndSelect('task.likes', 'likes')
      .leftJoinAndSelect('likes.user', 'likeUser')
      .leftJoinAndSelect('task.comments', 'comments', 'comments.isActive = :isActive', { isActive: true })
      .leftJoinAndSelect('comments.user', 'commentUser')
      .where('task.taskId = :taskId', { taskId })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .getOne();
  }

  async findUserTasks(userId: number, includeAssigned: boolean = true): Promise<Task[]> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedToUser', 'assignedUser')
      .leftJoinAndSelect('task.createdByUser', 'createdUser')
      .where('task.isActive = :isActive', { isActive: true });

    if (includeAssigned) {
      // For "Schedule" tab: show tasks created by user OR assigned to user
      qb.andWhere('(task.createdBy = :userId OR task.assignedTo = :userId)', { userId });
    } else {
      // For "My Tasks" tab: show tasks assigned to user OR created by user
      qb.andWhere('(task.assignedTo = :userId OR task.createdBy = :userId)', { userId });
    }

    return qb.orderBy('task.createdAt', 'DESC').getMany();
  }

  async updateTaskStatus(taskId: string, status: 'draft' | 'upcoming' | 'past' | 'done'): Promise<void> {
    await this.repository.update(taskId, { status, updatedAt: new Date() });
  }

  async softDelete(taskId: string): Promise<void> {
    await this.repository.update(taskId, { isActive: false, updatedAt: new Date() });
  }

  async getCommentCount(taskId: string): Promise<number> {
    const result = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)')
      .from('task_comments', 'comment')
      .where('comment.taskId = :taskId', { taskId })
      .andWhere('comment.isActive = :isActive', { isActive: true })
      .getRawOne();
    
    return parseInt(result['COUNT(*)']) || 0;
  }

  async getLikeCount(taskId: string): Promise<number> {
    const result = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)')
      .from('task_likes', 'like')
      .where('like.taskId = :taskId', { taskId })
      .getRawOne();
    
    return parseInt(result['COUNT(*)']) || 0;
  }

  async getLikeCountsByType(taskId: string): Promise<{ like: number; love: number; laugh: number; angry: number }> {
    const result = await this.repository.manager
      .createQueryBuilder()
      .select('likeType, COUNT(*) as count')
      .from('task_likes', 'like')
      .where('like.taskId = :taskId', { taskId })
      .groupBy('likeType')
      .getRawMany();
    
    const counts = { like: 0, love: 0, laugh: 0, angry: 0 };
    
    result.forEach(item => {
      counts[item.likeType] = parseInt(item.count) || 0;
    });
    
    return counts;
  }

  async findOverdueTasks(): Promise<Task[]> {
    return this.repository
      .createQueryBuilder('task')
      .where('(task.dueDate < :now OR (task.endDate < :now AND task.endDate IS NOT NULL))', { now: new Date() })
      .andWhere('task.status IN (:...statuses)', { statuses: ['draft', 'upcoming'] })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .getMany();
  }

  async getTopPerformers(limit: number = 5): Promise<Array<{userId: number, userName: string, userLastName: string, completedTasks: number}>> {
    const result = await this.repository
      .createQueryBuilder('task')
      .select('user.userId', 'userId')
      .addSelect('user.userName', 'userName')
      .addSelect('user.userLastName', 'userLastName')
      .addSelect('COUNT(task.taskId)', 'completedTasks')
      .leftJoin('users', 'user', 'user.userId = task.createdBy')
      .where('task.status = :status', { status: 'done' })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.createdBy IS NOT NULL')
      .groupBy('user.userId')
      .addGroupBy('user.userName')
      .addGroupBy('user.userLastName')
      .orderBy('completedTasks', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(row => ({
      userId: row.userId,
      userName: row.userName || 'Unknown',
      userLastName: row.userLastName || 'User',
      completedTasks: parseInt(row.completedTasks) || 0
    }));
  }

  async getUserRank(userId: number): Promise<{ rank: number; completedTasks: number; totalUsers: number }> {
    // Get all users with their completed task counts
    const allUserStats = await this.repository
      .createQueryBuilder('task')
      .select('user.userId', 'userId')
      .addSelect('COUNT(task.taskId)', 'completedTasks')
      .leftJoin('users', 'user', 'user.userId = task.createdBy')
      .where('task.status = :status', { status: 'done' })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.createdBy IS NOT NULL')
      .groupBy('user.userId')
      .orderBy('completedTasks', 'DESC')
      .getRawMany();

    // Find the user's rank and completed tasks
    const userStat = allUserStats.find(stat => stat.userId === userId);
    const completedTasks = userStat ? parseInt(userStat.completedTasks) : 0;
    
    // Calculate rank (1-based index)
    let rank = allUserStats.length + 1; // Default to last if user has no completed tasks
    if (completedTasks > 0) {
      rank = allUserStats.findIndex(stat => stat.userId === userId) + 1;
    }

    return {
      rank,
      completedTasks,
      totalUsers: allUserStats.length
    };
  }
}
