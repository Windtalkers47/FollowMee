import { Brackets, Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { TaskLike } from '../entities/TaskLike';
import { TaskComment } from '../entities/TaskComment';
import { BaseRepository } from './base.repository';
import { TaskQueryDto } from '../dtos/task.dto';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(Task);
  }

  async findById(id: string): Promise<Task | null> {
    return this.repository.findOne({ where: { taskId: id, isActive: true } });
  }

  async findTasksWithRelations(query: TaskQueryDto, viewerUserId?: number): Promise<[Task[], number]> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedToUser', 'assignedUser')
      .leftJoinAndSelect('task.createdByUser', 'createdUser')
      .where('task.isActive = :isActive', { isActive: true });

    // Search functionality - only search when explicitly requested
    if (query.search && !query.clearSearch) {
      qb.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    // Filter by status - ensure status is always an array
    if (query.status) {
      const statusArray = Array.isArray(query.status) ? query.status : [query.status];
      if (statusArray.length > 0) {
        qb.andWhere('task.status IN (:...status)', { status: statusArray });
      }
    }

    // Filter by assigned user
    if (query.assignedTo && query.assignedTo > 0) {
      qb.andWhere('task.assignedTo = :assignedTo', { assignedTo: query.assignedTo });
    }

    // Filter by created by user
    if (query.createdBy && query.createdBy > 0) {
      qb.andWhere('task.createdBy = :createdBy', { createdBy: query.createdBy });
    }

    // Pagination
    if (query.page && query.limit) {
      qb.skip((query.page - 1) * query.limit)
        .take(query.limit);
    }

    // Sorting
    qb.orderBy('task.createdAt', 'DESC');

    const [tasks, total] = await qb.getManyAndCount();
    if (tasks.length > 0) {
      const taskIds = tasks.map((task) => task.taskId);
      const likes = await this.repository.manager.getRepository(TaskLike)
        .createQueryBuilder('like')
        .select(['like.taskId AS taskId', 'like.likeType AS likeType', 'like.userId AS userId'])
        .where('like.taskId IN (:...taskIds)', { taskIds })
        .getRawMany();
      const comments = await this.repository.manager.getRepository(TaskComment)
        .createQueryBuilder('comment')
        .select('comment.taskId', 'taskId')
        .addSelect('COUNT(comment.commentId)', 'count')
        .where('comment.taskId IN (:...taskIds)', { taskIds })
        .andWhere('comment.isActive = :active', { active: true })
        .groupBy('comment.taskId')
        .getRawMany();
      const commentCounts = new Map(comments.map((row: { taskId: string; count: string }) => [row.taskId, Number(row.count)]));
      const counts = new Map<string, Record<string, number>>();
      likes.forEach((row: { taskId: string; likeType: string; userId: number }) => {
        const current = counts.get(row.taskId) || {};
        current[row.likeType] = (current[row.likeType] || 0) + 1;
        if (viewerUserId && Number(row.userId) === viewerUserId) current.userLike = row.likeType as any;
        counts.set(row.taskId, current);
      });
      tasks.forEach((task) => {
        (task as any)._reactionCounts = counts.get(task.taskId) || {};
        (task as any)._commentCount = commentCounts.get(task.taskId) || 0;
      });
    }
    return [tasks, total];
  }

  async findWithStats(taskId: string): Promise<Task | null> {
    return this.repository.findOne({
      where: { taskId, isActive: true },
      relations: ['assignedToUser', 'createdByUser', 'likes', 'comments']
    });
  }

  async updateTaskStatus(taskId: string, status: string): Promise<boolean> {
    const result = await this.repository.update(taskId, { status: status as any, updatedAt: new Date() });
    return result.affected !== undefined && result.affected > 0;
  }

  async incrementViewCount(taskId: string): Promise<void> {
    await this.repository.increment({ taskId }, 'viewCount', 1);
  }

  async incrementLikeCount(taskId: string): Promise<void> {
    await this.repository.increment({ taskId }, 'likeCount', 1);
  }

  async decrementLikeCount(taskId: string): Promise<void> {
    await this.repository.decrement({ taskId }, 'likeCount', 1);
  }

  async findUserTaskStats(userId: number) {
    const allUserStats = await this.repository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.taskId)', 'count')
      .where('task.assignedTo = :userId', { userId })
      .groupBy('task.status')
      .getRawMany();

    return allUserStats;
  }

  async findTasksByCustomer(customerId: number): Promise<Task[]> {
    return this.repository.find({
      where: { customerId: customerId as any, isActive: true } as any,
      relations: ['assignedToUser', 'createdByUser']
    });
  }

  async findTasksByAssignedUser(userId: number): Promise<Task[]> {
    return this.repository.find({
      where: { assignedTo: userId, isActive: true },
      relations: ['assignedToUser', 'createdByUser']
    });
  }

  async findMyWork(userId: number, limit: number, cursor?: string): Promise<{ tasks: Task[]; counts: Record<string, number> }> {
    const statuses = ['todo', 'in_progress', 'review'];
    const base = (qb: any) => qb
      .where('task.isActive = :isActive', { isActive: true })
      .andWhere('task.status IN (:...statuses)', { statuses })
      .andWhere(new Brackets((scope) => scope
        .where('task.assignedTo = :userId', { userId })
        .orWhere('(task.createdBy = :userId AND task.status = :review)', { userId, review: 'review' })
      ));

    const listQuery = base(this.repository.createQueryBuilder('task'))
      .leftJoinAndSelect('task.assignedToUser', 'assignedUser')
      .leftJoinAndSelect('task.createdByUser', 'createdUser')
      .orderBy('task.updatedAt', 'DESC')
      .addOrderBy('task.taskId', 'DESC')
      .take(Math.min(Math.max(limit, 1), 100));

    if (cursor) {
      const [cursorDate, cursorTaskId] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
      const parsedDate = new Date(cursorDate);
      if (!Number.isNaN(parsedDate.getTime()) && cursorTaskId) {
        listQuery.andWhere(new Brackets((after) => after
          .where('task.updatedAt < :cursorDate', { cursorDate: parsedDate })
          .orWhere('(task.updatedAt = :cursorDate AND task.taskId < :cursorTaskId)', { cursorDate: parsedDate, cursorTaskId })
        ));
      }
    }

    const countRows = await base(this.repository.createQueryBuilder('task'))
      .select('task.status', 'status')
      .addSelect('COUNT(task.taskId)', 'count')
      .groupBy('task.status')
      .getRawMany();
    const overdue = await base(this.repository.createQueryBuilder('task'))
      .andWhere('task.endDate IS NOT NULL AND task.endDate < :now', { now: new Date() })
      .getCount();
    const tasks = await listQuery.getMany();
    const counts = countRows.reduce((result: Record<string, number>, row: { status: string; count: string }) => {
      result[row.status] = Number(row.count);
      return result;
    }, {});
    counts.overdue = overdue;
    counts.approvalRequired = await base(this.repository.createQueryBuilder('task'))
      .andWhere('task.createdBy = :approvalUserId', { approvalUserId: userId })
      .andWhere('task.status = :approvalStatus', { approvalStatus: 'review' })
      .getCount();
    return { tasks, counts };
  }

  async findTasksCreatedByUser(userId: number): Promise<Task[]> {
    return this.repository.find({
      where: { createdBy: userId, isActive: true },
      relations: ['assignedToUser', 'createdByUser']
    });
  }

  async getTaskCountByStatus(): Promise<any[]> {
    return this.repository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.taskId)', 'count')
      .groupBy('task.status')
      .getRawMany();
  }

  async getTaskCountByPriority(): Promise<any[]> {
    return this.repository
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(task.taskId)', 'count')
      .groupBy('task.priority')
      .getRawMany();
  }

  async getOverdueTasks(): Promise<Task[]> {
    return this.repository
      .createQueryBuilder('task')
      .where('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status != :completed', { completed: 'completed' })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .getMany();
  }

  async getTasksDueToday(): Promise<Task[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return this.repository
      .createQueryBuilder('task')
      .where('task.dueDate = :today', { today: today.toISOString().split('T')[0] })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .getMany();
  }

  async getTasksDueThisWeek(): Promise<Task[]> {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return this.repository
      .createQueryBuilder('task')
      .where('task.dueDate BETWEEN :start AND :end', { 
        start: today.toISOString(), 
        end: nextWeek.toISOString() 
      })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .getMany();
  }

  async getRecentTasks(limit: number = 10): Promise<Task[]> {
    return this.repository.find({
      where: { isActive: true },
      relations: ['assignedToUser', 'createdByUser'],
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async searchTasks(searchTerm: string): Promise<Task[]> {
    return this.repository
      .createQueryBuilder('task')
      .where('task.isActive = :isActive', { isActive: true })
      .andWhere('(task.title LIKE :search OR task.description LIKE :search)', { 
        search: `%${searchTerm}%` 
      })
      .leftJoinAndSelect('task.assignedToUser', 'assignedUser')
      .leftJoinAndSelect('task.createdByUser', 'createdUser')
      .orderBy('task.createdAt', 'DESC')
      .getMany();
  }
}
