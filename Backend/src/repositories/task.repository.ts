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
      .leftJoin('task.likes', 'like')
      .leftJoin('task.comments', 'comment')
      .where('task.isActive = :isActive', { isActive: true });

    // Search functionality
    if (query.search) {
      qb.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${query.search}%` }
      );
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
      .leftJoinAndSelect('task.likes', 'likes', 'likes.isActive = :isActive', { isActive: true })
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
      qb.andWhere('(task.createdBy = :userId OR task.assignedTo = :userId)', { userId });
    } else {
      qb.andWhere('task.createdBy = :userId', { userId });
    }

    return qb.orderBy('task.createdAt', 'DESC').getMany();
  }

  async updateTaskStatus(taskId: string, status: 'draft' | 'upcoming' | 'past' | 'done'): Promise<void> {
    await this.repository.update(taskId, { status, updatedAt: new Date() });
  }

  async softDelete(taskId: string): Promise<void> {
    await this.repository.update(taskId, { isActive: false, updatedAt: new Date() });
  }

  async findOverdueTasks(): Promise<Task[]> {
    return this.repository
      .createQueryBuilder('task')
      .where('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status IN (:...statuses)', { statuses: ['draft', 'upcoming'] })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .getMany();
  }
}
