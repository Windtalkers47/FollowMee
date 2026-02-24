import { FindOptionsWhere, FindOneOptions } from 'typeorm';
import { Role } from '../entities/Role';
import { BaseRepository } from './base.repository';

export class RoleRepository extends BaseRepository<Role> {
  constructor() {
    super(Role);
  }

  async findByName(name: string): Promise<Role | null> {
    return this.repository.findOne({
      where: { roleName: name } as FindOptionsWhere<Role>,
    } as FindOneOptions<Role>);
  }

  async findByLevel(level: number): Promise<Role[]> {
    return this.find({ roleLevel: level });
  }

  async findActive(): Promise<Role[]> {
    return this.find({ isActive: true });
  }

  async findWithPermissions(roleId: number): Promise<Role | null> {
    return this.repository.findOne({
      where: { roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    } as FindOneOptions<Role>);
  }
}
