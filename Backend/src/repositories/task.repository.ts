import { Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { BaseRepository } from './base.repository';
import { TaskQueryDto } from '../dtos/task.dto';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(Task);
  }

  async findById(id: string): Promise<Task | null> {
    return this.repository.findOne({ where: { taskId: id, isActive: true } });
  }

  async findTasksWithRelations(query: TaskQueryDto): Promise<[Task[], number]> {
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