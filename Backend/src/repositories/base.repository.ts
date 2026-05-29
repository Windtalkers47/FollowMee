import { DataSource, Repository, EntityTarget, ObjectLiteral, FindOptionsWhere, FindManyOptions, FindOneOptions, UpdateResult } from 'typeorm';
import dataSource from '../config/database';

/**
 * Base repository providing common CRUD operations
 * This is a thin wrapper around TypeORM's Repository
 */
export class BaseRepository<T extends ObjectLiteral> {
  protected repository: Repository<T>;

  constructor(entity: EntityTarget<T>) {
    this.repository = dataSource.getRepository(entity);
  }

  /**
   * Find entities matching the given criteria
   */
  async find(where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<T[]> {
    return this.repository.find({ where });
  }

  /**
   * Find a single entity by options or where clause
   */
  async findOne(options?: FindOneOptions<T> | FindOptionsWhere<T>): Promise<T | null> {
    const findOptions: FindOneOptions<T> = typeof options === 'object' && 'where' in options 
      ? options as FindOneOptions<T>
      : { where: options as FindOptionsWhere<T> };
    return this.repository.findOne(findOptions);
  }

  /**
   * Find multiple entities with options
   */
  async findMany(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  /**
   * Create a new entity instance (does not save)
   */
  create(entityData: Partial<T>): T {
    const result = this.repository.create(entityData as any);
    return result as unknown as T;
  }

  /**
   * Create and save a new entity
   */
  async createAndSave(entityData: Partial<T>): Promise<T> {
    const entity = this.create(entityData);
    return this.repository.save(entity);
  }

  /**
   * Update entity by ID
   */
  async update(id: number | string, entityData: Partial<T>): Promise<boolean> {
    const result: UpdateResult = await this.repository.update(id, entityData as any);
    return result.affected !== undefined && result.affected > 0;
  }

  /**
   * Delete entity by criteria
   */
  async delete(criteria: FindOptionsWhere<T>): Promise<void> {
    await this.repository.delete(criteria);
  }

  /**
   * Save an entity
   */
  async save(entity: T): Promise<T> {
    return this.repository.save(entity);
  }

  /**
   * Remove an entity
   */
  async remove(entity: T): Promise<T> {
    return this.repository.remove(entity);
  }

  /**
   * Count entities matching criteria
   */
  async count(where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<number> {
    return this.repository.count({ where });
  }

  /**
   * Check if entity exists
   */
  async exists(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<boolean> {
    return this.repository.exists({ where });
  }

  /**
   * Get the underlying TypeORM repository
   */
  getRepository(): Repository<T> {
    return this.repository;
  }
}