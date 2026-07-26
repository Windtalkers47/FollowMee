import { Repository, FindOptionsWhere, FindOneOptions } from 'typeorm';
import { TaskComment } from '../entities/TaskComment';
import dataSource from '../config/database';

export class TaskCommentRepository {
  private _repository: Repository<TaskComment>;

  constructor() {
    this._repository = dataSource.getRepository(TaskComment);
  }

  /**
   * Find a single comment by options
   */
  async findOne(options?: FindOneOptions<TaskComment> | FindOptionsWhere<TaskComment>): Promise<TaskComment | null> {
    if (options && 'where' in options) {
      return this._repository.findOne(options as FindOneOptions<TaskComment>);
    }
    return this._repository.findOne({ where: options as FindOptionsWhere<TaskComment> });
  }

  /**
   * Find comments by task ID
   */
  async findByTaskId(taskId: string): Promise<TaskComment[]> {
    return this._repository.find({
      where: { taskId, isActive: true } as unknown as FindOptionsWhere<TaskComment>,
      relations: ['user', 'parentComment', 'reactions', 'reactions.user'],
      order: { createdAt: 'ASC' }
    });
  }

  /**
   * Find a comment with relations
   */
  async findOneWithRelations(where: FindOptionsWhere<TaskComment>): Promise<TaskComment | null> {
    return this._repository.findOne({
      where,
      relations: ['user', 'parentComment', 'reactions']
    });
  }

  /**
   * Save a comment
   */
  async save(comment: TaskComment): Promise<TaskComment> {
    return this._repository.save(comment);
  }

  /**
   * Create a new comment instance
   */
  create(data: Partial<TaskComment>) {
    return this._repository.create(data as any);
  }

  /**
   * Delete a comment
   */
  async delete(criteria: FindOptionsWhere<TaskComment>): Promise<void> {
    await this._repository.delete(criteria);
  }

  /**
   * Count comments by task ID
   */
  async countByTaskId(taskId: string): Promise<number> {
    return this._repository.count({
      where: { taskId, isActive: true } as unknown as FindOptionsWhere<TaskComment>
    });
  }
}
