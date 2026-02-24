import { FindOptionsWhere, FindOneOptions } from 'typeorm';
import { Permission } from '../entities/Permission';
import { BaseRepository } from './base.repository';

export class PermissionRepository extends BaseRepository<Permission> {
  constructor() {
    super(Permission);
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.repository.findOne({
      where: { permissionName: name } as FindOptionsWhere<Permission>,
    } as FindOneOptions<Permission>);
  }

  async findByNames(names: string[]): Promise<Permission[]> {
    return this.repository.find({
      where: names.map(name => ({ permissionName: name } as FindOptionsWhere<Permission>)),
    } as FindOneOptions<Permission>);
  }
}
