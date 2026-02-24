import { UserRole } from '../entities/UserRole';
import { BaseRepository } from './base.repository';

export class UserRoleRepository extends BaseRepository<UserRole> {
  constructor() {
    super(UserRole);
  }

  async findByUserId(userId: number): Promise<UserRole[]> {
    return this.repository.find({
      where: { userId },
      relations: ['role'],
    });
  }

  async findByRoleId(roleId: number): Promise<UserRole[]> {
    return this.repository.find({
      where: { roleId },
      relations: ['user'],
    });
  }

  async assignRole(userId: number, roleId: number): Promise<UserRole> {
    const userRole = new UserRole();
    userRole.userId = userId;
    userRole.roleId = roleId;
    return this.create(userRole);
  }

  async removeRole(userId: number, roleId: number): Promise<boolean> {
    const result = await this.repository.delete({ userId, roleId });
    return result.affected ? result.affected > 0 : false;
  }

  async removeAllRolesFromUser(userId: number): Promise<boolean> {
    const result = await this.repository.delete({ userId });
    return result.affected ? result.affected > 0 : false;
  }
}
