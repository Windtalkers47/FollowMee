import * as bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../repositories/role.repository';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { PermissionRepository } from '../repositories/permission.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import { NotificationHelper } from '../utils/notification.util';
import AppDataSource from '../config/database';
import { UserRole } from '../entities/UserRole';
import { ApplicationError } from '../errors/application.error';
import { isOwnerRole } from '../utils/role.util';

interface UserWithRolesResponse extends UserResponseDto {
  roles: string[];
  permissions: string[];
}

export interface ManagedUserResponse extends UserResponseDto {
  role?: { roleId: number; roleName: string };
  roles: Array<{ roleId: number; roleName: string }>;
  permissions: string[];
}

export class UserService {
  private userRepository: UserRepository;
  private roleRepository: RoleRepository;
  private userRoleRepository: UserRoleRepository;
  private permissionRepository: PermissionRepository;
  private rolePermissionRepository: RolePermissionRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.roleRepository = new RoleRepository();
    this.userRoleRepository = new UserRoleRepository();
    this.permissionRepository = new PermissionRepository();
    this.rolePermissionRepository = new RolePermissionRepository();
  }

  private async assertUserIsNotSystemOwner(userId: number): Promise<void> {
    const rows = await AppDataSource.query(
      'SELECT userId FROM system_owner WHERE singletonId = 1 AND userId = ? LIMIT 1',
      [userId],
    );
    if (rows.length > 0) {
      throw new ApplicationError(
        'Use the ownership transfer flow before changing or removing the Owner',
        'OWNER_TRANSFER_REQUIRED',
        409,
      );
    }
  }

  /**
   * Get all active users
   */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({ isActive: true });
    return users.map(user => new UserResponseDto(user));
  }

  async getAllManagedUsers(): Promise<ManagedUserResponse[]> {
    const users = await this.userRepository.getRepository().find({
      where: { isActive: true },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
      order: { createdAt: 'ASC' },
    });
    return users.map((user) => this.mapManagedUser(user));
  }

  async getManagedUser(userId: number): Promise<ManagedUserResponse> {
    const user = await this.userRepository.getRepository().findOne({
      where: { userId },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });
    if (!user) throw new Error('User not found');
    return this.mapManagedUser(user);
  }

  private mapManagedUser(user: User): ManagedUserResponse {
    const roles = (user.userRoles || [])
      .filter((userRole) => Boolean(userRole.role))
      .map((userRole) => ({
        roleId: userRole.role.roleId,
        roleName: userRole.role.roleName,
      }));
    const permissions = new Set<string>();
    (user.userRoles || []).forEach((userRole) => {
      (userRole.role?.rolePermissions || []).forEach((rolePermission) => {
        if (rolePermission.permission?.permissionName) permissions.add(rolePermission.permission.permissionName);
      });
    });
    const dto = new UserResponseDto(user);
    return {
      ...dto,
      fullName: dto.fullName,
      role: roles[0],
      roles,
      permissions: [...permissions],
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ userId: id });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return new UserResponseDto(user);
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDto): Promise<{ user: UserResponseDto; reactivated: boolean }> {
    // Check for active user with same email
    const activeByEmail = await this.userRepository.findByEmail(userData.userEmail, false, true);
    if (activeByEmail) {
      throw new Error('User with this email already exists');
    }

    // Check for active user with same name
    const activeByName = await this.userRepository.findByName(userData.userName, userData.userLastName, true);
    if (activeByName) {
      throw new Error('User with this name already exists');
    }

    // Check for inactive user with same email - reactivate if found
    const inactiveByEmail = await this.userRepository.findByEmail(userData.userEmail, false, false);
    if (inactiveByEmail && !inactiveByEmail.isActive) {
      const user = await this.reactivateUser(inactiveByEmail.userId, userData);
      return { user, reactivated: true };
    }

    // Check for inactive user with same name - reactivate if found
    const inactiveByName = await this.userRepository.findByName(userData.userName, userData.userLastName, false);
    if (inactiveByName && !inactiveByName.isActive) {
      const user = await this.reactivateUser(inactiveByName.userId, userData);
      return { user, reactivated: true };
    }

    // No existing user, create new
    const user = new User();
    Object.assign(user, userData);
    
    // Save will trigger the @BeforeInsert hook to hash the password
    const createdUser = await this.userRepository.create(user);
    
    return { user: new UserResponseDto(createdUser), reactivated: false };
  }

  /**
   * Reactivate an inactive user with new data
   */
  private async reactivateUser(id: number, userData: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ userId: id });
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    // Update user with new data
    Object.assign(user, userData);
    user.isActive = true;
    user.deletedAt = undefined;
    user.updatedAt = new Date();

    const success = await this.userRepository.update(id, user);
    if (!success) {
      throw new Error(`Failed to reactivate user with ID ${id}`);
    }
    
    const updated = await this.userRepository.findOne({ userId: id });
    if (!updated) {
      throw new Error(`User with ID ${id} not found after reactivation`);
    }
    return new UserResponseDto(updated);
  }

  /**
   * Update user information
   */
  async updateUser(
    id: number, 
    userData: Partial<UpdateUserDto>
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ userId: id });
    if (!user) {
      throw new Error('User not found');
    }
    if (userData.isActive === false) await this.assertUserIsNotSystemOwner(id);

    // Check if email is being updated and if it's already in use by an active user
    if (userData.userEmail && userData.userEmail !== user.userEmail) {
      const activeByEmail = await this.userRepository.findByEmail(userData.userEmail, false, true);
      if (activeByEmail) {
        throw new Error('Email already in use');
      }
    }

    // Check if name is being updated and if it's already in use by an active user
    if (
      userData.userName &&
      (userData.userName !== user.userName ||
       (userData.userLastName !== undefined && userData.userLastName !== user.userLastName))
    ) {
      const activeByName = await this.userRepository.findByName(
        userData.userName,
        userData.userLastName,
        true
      );
      if (activeByName && activeByName.userId !== id) {
        throw new Error('User with this name already exists');
      }
    }

    // Handle image removal if userImageUrl is explicitly set to null or empty
    if (userData.userImageUrl === null || userData.userImageUrl === '') {
      // Delete old image from Cloudinary if it exists
      if (user.userImageUrl) {
        try {
          await CloudinaryUtil.deleteImage(user.userImageUrl);
        } catch (error) {
          console.error('Failed to delete old image from Cloudinary:', error);
        }
      }
      // Set to null in database
      userData.userImageUrl = null;
    }

    // Update user data
    Object.assign(user, userData);
    
    // If password is being updated, it will be hashed by the @BeforeUpdate hook
    if (userData.userPassword) {
      user.userPassword = userData.userPassword;
    }

    const success = await this.userRepository.update(id, user);
    if (!success) {
      throw new Error('Failed to update user');
    }

    const updated = await this.userRepository.findOne({ userId: id });
    if (!updated) {
      throw new Error('User not found after update');
    }
    return new UserResponseDto(updated);
  }

  /**
   * Soft delete a user (mark as inactive)
   */
  async deleteUser(id: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ userId: id });
    if (!user) {
      throw new Error('User not found');
    }

    await this.assertUserIsNotSystemOwner(id);

    await this.userRepository.markAsInactive(id);
    
    // Remove all user roles when deactivating user (but keep user record for history)
    await this.userRoleRepository.removeAllRolesFromUser(id);
    
    return { message: 'User deactivated successfully' };
  }

  async getDeactivationImpact(id: number) {
    await this.assertUserIsNotSystemOwner(id);
    const rows = await AppDataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM tasks WHERE assignedTo = ? AND status IN ('todo','in_progress','review')) AS activeTasks,
        (SELECT COUNT(*) FROM tasks WHERE createdBy = ? AND status = 'draft') AS drafts,
        (SELECT COUNT(*) FROM task_recurrence_rules WHERE createdBy = ? AND isActive = 1) AS recurringRules,
        (SELECT COUNT(*) FROM customers WHERE assignedTo = ? AND deletedAt IS NULL) AS customers,
        (SELECT COUNT(*) FROM tasks WHERE createdBy = ? AND status = 'review') AS approvals
    `, [id, id, id, id, id]);
    const impact = rows[0] || {};
    const requiresTransfer = Object.values(impact).some(value => Number(value || 0) > 0);
    return { ...impact, requiresTransfer };
  }

  async reassignAndDeactivate(id: number, transferTo: number | null, actorUserId: number) {
    const impact = await this.getDeactivationImpact(id);
    if (impact.requiresTransfer && !transferTo) throw new ApplicationError('Choose an active user to receive assigned resources', 'USER_TRANSFER_REQUIRED', 409);
    if (transferTo === id) throw new ApplicationError('Resources must be transferred to another user', 'USER_TRANSFER_INVALID', 400);
    if (transferTo) {
      const recipient = await this.userRepository.findOne({ userId: transferTo });
      if (!recipient?.isActive) throw new ApplicationError('Transfer recipient must be active', 'USER_TRANSFER_RECIPIENT_INACTIVE', 409);
    }
    await this.assertUserIsNotSystemOwner(id);
    await AppDataSource.transaction(async manager => {
      if (transferTo) {
        await manager.query(`UPDATE tasks SET assignedTo = ? WHERE assignedTo = ? AND status IN ('todo','in_progress','review')`, [transferTo, id]);
        await manager.query(`UPDATE tasks SET createdBy = ? WHERE createdBy = ? AND status IN ('draft','review')`, [transferTo, id]);
        await manager.query(`UPDATE task_recurrence_rules SET createdBy = ?, updatedAt = CURRENT_TIMESTAMP WHERE createdBy = ? AND isActive = 1`, [transferTo, id]);
        await manager.query(`UPDATE task_templates SET createdBy = ?, updatedAt = CURRENT_TIMESTAMP WHERE createdBy = ?`, [transferTo, id]);
        await manager.query(`UPDATE customers SET assignedTo = ?, userId = ?, updatedBy = ? WHERE assignedTo = ? AND deletedAt IS NULL`, [transferTo, transferTo, actorUserId, id]);
      }
      await manager.query('UPDATE users SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?', [id]);
      await manager.query('DELETE FROM user_roles WHERE userId = ?', [id]);
    });
    return { message: 'Resources reassigned and user deactivated', transferredTo: transferTo, impact };
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(
      (await this.getUserById(userId)).userEmail,
      true // Include password fields
    ) as User & { userPassword: string };

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.userPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update to new password (will be hashed by the repository)
    return this.userRepository.updatePassword(userId, newPassword);
  }

  /**
   * Get user with roles and permissions
   */
  async getUserWithRoles(userId: number): Promise<UserWithRolesResponse> {
    const user = await this.userRepository.findOne({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    const userRoles = await this.userRoleRepository.findByUserId(userId);
    const roles = userRoles.map(ur => ur.role?.roleName).filter(Boolean) as string[];

    // Get permissions for all user roles
    const permissions = new Set<string>();
    for (const userRole of userRoles) {
      if (userRole.role) {
        const roleWithPermissions = await this.roleRepository.findWithPermissions(userRole.role.roleId);
        if (roleWithPermissions) {
          roleWithPermissions.rolePermissions.forEach(rp => {
            if (rp.permission?.permissionName) {
              permissions.add(rp.permission.permissionName);
            }
          });
        }
      }
    }

    const userDto = new UserResponseDto(user);
    const result: UserWithRolesResponse = {
      ...userDto,
      roles,
      permissions: Array.from(permissions),
      fullName: userDto.fullName // Explicitly include fullName
    };
    return result;
  }

  /**
   * Assign role to user (replaces existing roles)
   */
  async assignRoleToUser(userId: number, roleId: number, actorUserId?: number): Promise<ManagedUserResponse> {
    // Check if user exists
    const user = await this.userRepository.findOne({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Check if role exists
    const role = await this.roleRepository.findOne({ roleId });
    if (!role) {
      throw new Error('Role not found');
    }
    if (isOwnerRole(role.roleName)) {
      throw new ApplicationError(
        'Owner can only be changed through the ownership transfer flow',
        'OWNER_TRANSFER_REQUIRED',
        409,
      );
    }
    await this.assertUserIsNotSystemOwner(userId);

    await AppDataSource.transaction(async (manager) => {
      await manager.getRepository(UserRole).delete({ userId });
      await manager.getRepository(UserRole).save(manager.getRepository(UserRole).create({ userId, roleId }));
    });

    if (actorUserId && actorUserId !== userId) {
      try {
        await NotificationHelper.notifyRoleChanged(role.roleName, actorUserId, [userId], userId);
      } catch (error) {
        console.error(JSON.stringify({
          event: 'role_change_notification_failed',
          attempt: 1,
          userId,
          roleId,
          actorUserId,
          error: error instanceof Error ? error.message : String(error),
        }));
        try {
          await NotificationHelper.notifyRoleChanged(role.roleName, actorUserId, [userId], userId);
        } catch (retryError) {
          console.error(JSON.stringify({
            event: 'role_change_notification_failed',
            attempt: 2,
            userId,
            roleId,
            actorUserId,
            error: retryError instanceof Error ? retryError.message : String(retryError),
          }));
        }
      }
    }

    return this.getManagedUser(userId);
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: number, roleId: number, actorUserId?: number): Promise<boolean> {
    // Check if user exists
    const user = await this.userRepository.findOne({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Check if role exists
    const role = await this.roleRepository.findOne({ roleId });
    if (!role) {
      throw new Error('Role not found');
    }
    if (isOwnerRole(role.roleName)) {
      throw new ApplicationError(
        'Owner can only be changed through the ownership transfer flow',
        'OWNER_TRANSFER_REQUIRED',
        409,
      );
    }
    await this.assertUserIsNotSystemOwner(userId);

    const removed = await this.userRoleRepository.removeRole(userId, roleId);
    if (removed && actorUserId && actorUserId !== userId) {
      try {
        await NotificationHelper.notifyRoleChanged('No assigned role', actorUserId, [userId], userId);
      } catch (error) {
        console.error(JSON.stringify({
          event: 'role_change_notification_failed',
          attempt: 1,
          userId,
          roleId,
          actorUserId,
          error: error instanceof Error ? error.message : String(error),
        }));
        try {
          await NotificationHelper.notifyRoleChanged('No assigned role', actorUserId, [userId], userId);
        } catch (retryError) {
          console.error(JSON.stringify({
            event: 'role_change_notification_failed',
            attempt: 2,
            userId,
            roleId,
            actorUserId,
            error: retryError instanceof Error ? retryError.message : String(retryError),
          }));
        }
      }
    }
    return removed;
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<any[]> {
    const roles = await this.roleRepository.findMany({
      where: { isActive: true } as any,
      relations: ['rolePermissions', 'rolePermissions.permission']
    } as any);
    return roles.map(role => ({
      roleId: role.roleId,
      roleName: role.roleName,
      description: role.description,
      roleLevel: role.roleLevel,
      permissions: role.permissions
    }));
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleById(roleId: number): Promise<any> {
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    return {
      roleId: role.roleId,
      roleName: role.roleName,
      description: role.description,
      roleLevel: role.roleLevel,
      permissions: role.permissions
    };
  }

  /**
   * Create new role
   */
  async createRole(roleData: { roleName: string; description?: string; roleLevel?: number }): Promise<any> {
    // Check if role name already exists
    const existingRole = await this.roleRepository.findByName(roleData.roleName);
    if (existingRole) {
      throw new Error('Role with this name already exists');
    }

    const role = new (await import('../entities/Role')).Role();
    Object.assign(role, roleData);
    role.isActive = true;

    const createdRole = await this.roleRepository.create(role);
    return {
      roleId: createdRole.roleId,
      roleName: createdRole.roleName,
      description: createdRole.description,
      roleLevel: createdRole.roleLevel
    };
  }

  /**
   * Update role
   */
  async updateRole(roleId: number, roleData: Partial<{ roleName: string; description?: string; roleLevel?: number; isActive?: boolean }>): Promise<any> {
    const role = await this.roleRepository.findOne({ roleId });
    if (!role) {
      throw new Error('Role not found');
    }

    // Check if role name is being updated and already exists
    if (roleData.roleName && roleData.roleName !== role.roleName) {
      const existingRole = await this.roleRepository.findByName(roleData.roleName);
      if (existingRole) {
        throw new Error('Role with this name already exists');
      }
    }

    Object.assign(role, roleData);
    const success = await this.roleRepository.update(roleId, role);
    if (!success) {
      throw new Error('Failed to update role');
    }

    const updated = await this.roleRepository.findOne({ roleId });
    if (!updated) {
      throw new Error('Role not found after update');
    }

    return {
      roleId: updated.roleId,
      roleName: updated.roleName,
      description: updated.description,
      roleLevel: updated.roleLevel,
      isActive: updated.isActive
    };
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(roleId: number, permissionId: number): Promise<boolean> {
    // Check if role exists
    const role = await this.roleRepository.findOne({ roleId });
    if (!role) {
      throw new Error('Role not found');
    }

    // Check if permission exists
    const permission = await this.permissionRepository.findOne({ permissionId });
    if (!permission) {
      throw new Error('Permission not found');
    }

    // Check if role already has this permission
    const existingRolePermission = await this.rolePermissionRepository.findOne({ roleId, permissionId });
    if (existingRolePermission) {
      throw new Error('Role already has this permission');
    }

    // Create role-permission relationship
    const rolePermission = new (await import('../entities/RolePermission')).RolePermission();
    rolePermission.roleId = roleId;
    rolePermission.permissionId = permissionId;

    await this.rolePermissionRepository.create(rolePermission);
    return true;
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(roleId: number, permissionId: number): Promise<boolean> {
    // Check if role exists
    const role = await this.roleRepository.findOne({ roleId });
    if (!role) {
      throw new Error('Role not found');
    }

    // Check if permission exists
    const permission = await this.permissionRepository.findOne({ permissionId });
    if (!permission) {
      throw new Error('Permission not found');
    }

    return this.rolePermissionRepository.removePermissionFromRole(roleId, permissionId);
  }
}

export default new UserService();
