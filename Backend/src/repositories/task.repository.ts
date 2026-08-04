import { Brackets, Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { TaskLike } from '../entities/TaskLike';
import { TaskComment } from '../entities/TaskComment';
import { BaseRepository } from './base.repository';
import { TaskQueryDto } from '../dtos/task.dto';
import { createTaskFocusSummary, getBangkokDateBoundaries, TaskFocusSummary } from '../utils/task-focus.util';
import type { TaskAccessContext } from '../services/task-access.service';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(Task);
  }

  async findById(id: string): Promise<Task | null> {
    return this.repository.findOne({ where: { taskId: id, isActive: true } });
  }

  async findTasksWithRelations(query: TaskQueryDto, access?: TaskAccessContext): Promise<[Task[], number]> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignedToUser', 'assignedUser')
      .leftJoinAndSelect('task.createdByUser', 'createdUser')
      .where('task.isActive = :isActive', { isActive: true });

    if (access) {
      qb.andWhere('(task.status != :draftStatus OR task.createdBy = :draftViewer OR :isOwner = 1)', {
        draftStatus: 'draft',
        draftViewer: access.userId,
        isOwner: access.isOwner ? 1 : 0,
      });
    } else {
      qb.andWhere('task.status != :draftStatus', { draftStatus: 'draft' });
    }

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

    const { todayStart, tomorrowStart, soonEnd, weekEnd } = getBangkokDateBoundaries();
    const dueExpression = 'COALESCE(task.endDate, task.dueDate)';
    if (query.dueFilter === 'overdue') {
      qb.andWhere(`${dueExpression} IS NOT NULL AND ${dueExpression} < :todayStart`, { todayStart });
      qb.andWhere('task.status NOT IN (:...terminalStatuses)', { terminalStatuses: ['done', 'cancelled'] });
    } else if (query.dueFilter === 'today') {
      qb.andWhere(`${dueExpression} >= :todayStart AND ${dueExpression} < :tomorrowStart`, { todayStart, tomorrowStart });
    } else if (query.dueFilter === 'soon') {
      qb.andWhere(`${dueExpression} >= :tomorrowStart AND ${dueExpression} < :soonEnd`, { tomorrowStart, soonEnd });
    } else if (query.dueFilter === 'week') {
      qb.andWhere(`${dueExpression} >= :todayStart AND ${dueExpression} < :weekEnd`, { todayStart, weekEnd });
    }

    // Pagination
    if (query.page && query.limit) {
      qb.skip((query.page - 1) * query.limit)
        .take(query.limit);
    }

    if (query.sort === 'title_asc') {
      qb.orderBy('task.title', 'ASC');
    } else if (query.sort === 'due_asc') {
      qb.orderBy(`${dueExpression} IS NULL`, 'ASC')
        .addOrderBy(dueExpression, 'ASC');
    } else {
      qb.orderBy('task.updatedAt', 'DESC');
    }

    const [tasks, total] = await qb.getManyAndCount();
    if (tasks.length > 0) {
      const taskIds = tasks.map((task) => task.taskId);
      const likes = await this.repository.manager.getRepository(TaskLike)
        .createQueryBuilder('like')
        .select('like.taskId', 'taskId')
        .addSelect("SUM(CASE WHEN like.likeType='like' THEN 1 ELSE 0 END)", 'like')
        .addSelect("SUM(CASE WHEN like.likeType='love' THEN 1 ELSE 0 END)", 'love')
        .addSelect("SUM(CASE WHEN like.likeType='laugh' THEN 1 ELSE 0 END)", 'laugh')
        .addSelect("SUM(CASE WHEN like.likeType='angry' THEN 1 ELSE 0 END)", 'angry')
        .addSelect("SUM(CASE WHEN like.likeType='wow' THEN 1 ELSE 0 END)", 'wow')
        .addSelect("SUM(CASE WHEN like.likeType='sad' THEN 1 ELSE 0 END)", 'sad')
        .addSelect('MAX(CASE WHEN like.userId=:viewerId THEN like.likeType ELSE NULL END)', 'userLike')
        .where('like.taskId IN (:...taskIds)', { taskIds })
        .setParameter('viewerId', access?.userId || 0)
        .groupBy('like.taskId')
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
      likes.forEach((row: Record<string, string>) => {
        counts.set(row.taskId, {
          like: Number(row.like) || 0, love: Number(row.love) || 0, laugh: Number(row.laugh) || 0,
          angry: Number(row.angry) || 0, wow: Number(row.wow) || 0, sad: Number(row.sad) || 0,
          ...(row.userLike ? { userLike: row.userLike as any } : {}),
        });
      });
      tasks.forEach((task) => {
        (task as any)._reactionCounts = counts.get(task.taskId) || {};
        (task as any)._commentCount = commentCounts.get(task.taskId) || 0;
      });
    }
    return [tasks, total];
  }

  async findWithStats(taskId: string): Promise<Task | null> {
    const task = await this.repository.findOne({
      where: { taskId, isActive: true },
      relations: ['assignedToUser', 'createdByUser']
    });
    if (!task) return null;
    const [reactions, comments] = await Promise.all([
      this.repository.manager.getRepository(TaskLike).createQueryBuilder('like')
        .select('like.likeType', 'type').addSelect('COUNT(*)', 'count')
        .where('like.taskId=:taskId', { taskId }).groupBy('like.likeType').getRawMany(),
      this.repository.manager.getRepository(TaskComment).count({ where: { taskId, isActive: true } }),
    ]);
    (task as any)._reactionCounts = Object.fromEntries(reactions.map((row: { type: string; count: string }) => [row.type, Number(row.count)]));
    (task as any)._commentCount = comments;
    return task;
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

  async findMyWork(userId: number, limit: number, cursor?: string): Promise<{ tasks: Task[]; counts: Record<string, number | string> }> {
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

    const { todayStart, tomorrowStart, soonEnd } = getBangkokDateBoundaries();
    const dueExpression = 'COALESCE(task.endDate, task.dueDate)';
    const countRow = await base(this.repository.createQueryBuilder('task'))
      .select(`SUM(CASE WHEN task.status = 'todo' THEN 1 ELSE 0 END)`, 'todo')
      .addSelect(`SUM(CASE WHEN task.status = 'in_progress' THEN 1 ELSE 0 END)`, 'in_progress')
      .addSelect(`SUM(CASE WHEN task.status = 'review' THEN 1 ELSE 0 END)`, 'review')
      .addSelect(`SUM(CASE WHEN ${dueExpression} IS NOT NULL AND ${dueExpression} < :todayStart THEN 1 ELSE 0 END)`, 'overdue')
      .addSelect(`SUM(CASE WHEN ${dueExpression} >= :todayStart AND ${dueExpression} < :tomorrowStart THEN 1 ELSE 0 END)`, 'dueToday')
      .addSelect(`SUM(CASE WHEN ${dueExpression} >= :tomorrowStart AND ${dueExpression} < :soonEnd THEN 1 ELSE 0 END)`, 'dueSoon')
      .addSelect(`SUM(CASE WHEN task.createdBy = :approvalUserId AND task.status = 'review' THEN 1 ELSE 0 END)`, 'approvalRequired')
      .addSelect('MAX(task.updatedAt)', 'latestUpdate')
      .setParameters({ todayStart, tomorrowStart, soonEnd, approvalUserId: userId })
      .getRawOne();
    const tasks = await listQuery.getMany();
    const counts = {
      todo: Number(countRow?.todo) || 0,
      in_progress: Number(countRow?.in_progress) || 0,
      review: Number(countRow?.review) || 0,
      overdue: Number(countRow?.overdue) || 0,
      dueToday: Number(countRow?.dueToday) || 0,
      dueSoon: Number(countRow?.dueSoon) || 0,
      approvalRequired: Number(countRow?.approvalRequired) || 0,
      latestUpdate: countRow?.latestUpdate ? new Date(countRow.latestUpdate).toISOString() : 'empty',
    };
    return { tasks, counts };
  }

  async getScheduleMeta(access?: TaskAccessContext): Promise<{
    statusCounts: Record<string, number>;
    focus: TaskFocusSummary;
  }> {
    const { todayStart, tomorrowStart, soonEnd } = getBangkokDateBoundaries();
    const dueExpression = 'COALESCE(task.endDate, task.dueDate)';
    const qb = this.repository.createQueryBuilder('task')
      .where('task.isActive = :active', { active: true });
    if (access) {
      qb.andWhere('(task.status != :draftStatus OR task.createdBy = :draftViewer OR :isOwner = 1)', {
        draftStatus: 'draft',
        draftViewer: access.userId,
        isOwner: access.isOwner ? 1 : 0,
      });
    } else {
      qb.andWhere('task.status != :draftStatus', { draftStatus: 'draft' });
    }
    const row = await qb
      .select(`SUM(CASE WHEN task.status = 'draft' THEN 1 ELSE 0 END)`, 'draft')
      .addSelect(`SUM(CASE WHEN task.status = 'todo' THEN 1 ELSE 0 END)`, 'todo')
      .addSelect(`SUM(CASE WHEN task.status = 'in_progress' THEN 1 ELSE 0 END)`, 'in_progress')
      .addSelect(`SUM(CASE WHEN task.status = 'review' THEN 1 ELSE 0 END)`, 'review')
      .addSelect(`SUM(CASE WHEN task.status = 'done' THEN 1 ELSE 0 END)`, 'done')
      .addSelect(`SUM(CASE WHEN task.status = 'cancelled' THEN 1 ELSE 0 END)`, 'cancelled')
      .addSelect(`SUM(CASE WHEN task.status IN ('todo','in_progress','review') AND ${dueExpression} IS NOT NULL AND ${dueExpression} < :todayStart THEN 1 ELSE 0 END)`, 'overdue')
      .addSelect(`SUM(CASE WHEN task.status IN ('todo','in_progress','review') AND ${dueExpression} >= :todayStart AND ${dueExpression} < :tomorrowStart THEN 1 ELSE 0 END)`, 'dueToday')
      .addSelect(`SUM(CASE WHEN task.status IN ('todo','in_progress','review') AND ${dueExpression} >= :tomorrowStart AND ${dueExpression} < :soonEnd THEN 1 ELSE 0 END)`, 'dueSoon')
      .addSelect(`SUM(CASE WHEN task.status = 'review' THEN 1 ELSE 0 END)`, 'waitingReview')
      .addSelect('MAX(task.updatedAt)', 'latestUpdate')
      .setParameters({ todayStart, tomorrowStart, soonEnd })
      .getRawOne();
    const statusCounts = {
      draft: Number(row?.draft) || 0,
      todo: Number(row?.todo) || 0,
      in_progress: Number(row?.in_progress) || 0,
      review: Number(row?.review) || 0,
      done: Number(row?.done) || 0,
      cancelled: Number(row?.cancelled) || 0,
    };
    return {
      statusCounts: { ...statusCounts, all: Object.values(statusCounts).reduce((sum, count) => sum + count, 0) },
      focus: createTaskFocusSummary({
        overdue: Number(row?.overdue) || 0,
        dueToday: Number(row?.dueToday) || 0,
        dueSoon: Number(row?.dueSoon) || 0,
        waitingReview: Number(row?.waitingReview) || 0,
      }, row?.latestUpdate ? new Date(row.latestUpdate).toISOString() : 'empty', 'organization'),
    };
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
