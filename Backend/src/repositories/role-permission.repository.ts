import { RolePermission } from '../entities/RolePermission';
import { BaseRepository } from './base.repository';

export class RolePermissionRepository extends BaseRepository<RolePermission> {
  constructor() {
    super(RolePermission);
  }

  async findByRoleId(roleId: number): Promise<RolePermission[]> {
    return this.repository.find({
      where: { roleId },
      relations: ['permission'],
    });
  }

  async findByPermissionId(permissionId: number): Promise<RolePermission[]> {
    return this.repository.find({
      where: { permissionId },
      relations: ['role'],
    });
  }

  async assignPermissionToRole(roleId: number, permissionId: number): Promise<RolePermission> {
    const rolePermission = new RolePermission();
    rolePermission.roleId = roleId;
    rolePermission.permissionId = permissionId;
    return this.create(rolePermission);
  }

  async removePermissionFromRole(roleId: number, permissionId: number): Promise<boolean> {
    const result = await this.repository.delete({ roleId, permissionId });
    return result.affected ? result.affected > 0 : false;
  }

  async removeAllPermissionsFromRole(roleId: number): Promise<boolean> {
    const result = await this.repository.delete({ roleId });
    return result.affected ? result.affected > 0 : false;
  }
}
