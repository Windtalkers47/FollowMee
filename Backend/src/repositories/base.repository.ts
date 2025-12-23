import { DataSource, EntityTarget, FindManyOptions, FindOptionsWhere, ObjectLiteral, Repository, DeepPartial } from 'typeorm';
import dataSource from '../config/database';

export abstract class BaseRepository<T extends ObjectLiteral> {
  protected repository: Repository<T>;
  protected dataSource: DataSource;

  constructor(entity: EntityTarget<T>) {
    this.dataSource = dataSource;
    this.repository = this.dataSource.getRepository(entity);
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
    await this.repository.update(id, data as any);
    return this.findOne({ id } as any);
  }

  async delete(id: number | string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return where ? this.repository.count({ where }) : this.repository.count();
  }

  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }
}
