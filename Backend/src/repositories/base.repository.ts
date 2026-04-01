import { DataSource, EntityTarget, FindManyOptions, FindOptionsWhere, ObjectLiteral, Repository, DeepPartial } from 'typeorm';
import dataSource from '../config/database';

export abstract class BaseRepository<T extends ObjectLiteral> {
  protected repository: Repository<T>;
  protected dataSource: DataSource;

  constructor(entity: EntityTarget<T>, repository?: Repository<T>) {
    this.dataSource = dataSource;
    this.repository = repository || this.dataSource.getRepository(entity);
  }

  async findOne(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repository.findOne({ where });
  }

  async find(
    where?: FindOptionsWhere<T>,
    options: Omit<FindManyOptions<T>, 'where'> = {}
  ): Promise<T[]> {
    return this.repository.find({
      where,
      ...options,
    });
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number | string, data: DeepPartial<T>): Promise<T | null> {
    const metadata = this.repository.metadata;
    const primaryColumn = metadata.primaryColumns[0];
    const primaryKey = primaryColumn.propertyName;
    
    // First find the existing entity
    const existing = await this.findOne({ [primaryKey]: id } as any);
    if (!existing) return null;
    
    // Update the entity with new data
    Object.assign(existing, data);
    
    // Save the entity which will trigger @UpdateDateColumn
    return this.repository.save(existing);
  }

  async delete(id: number | string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async softDelete(id: number | string): Promise<boolean> {
    const result = await this.update(id, { deletedAt: new Date() } as any);
    return !!result;
  }

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return where ? this.repository.count({ where }) : this.repository.count();
  }

  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }
}
