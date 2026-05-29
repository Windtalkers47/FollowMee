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

interface UserWithRolesResponse extends UserResponseDto {
  roles: string[];
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

  /**
   * Get all active users
   */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({ isActive: true });
    return users.map(user => new UserResponseDto(user));
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

    await this.userRepository.markAsInactive(id);
    
    // Remove all user roles when deactivating user (but keep user record for history)
    await this.userRoleRepository.removeAllRolesFromUser(id);
    
    return { message: 'User deactivated successfully' };
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
  async assignRoleToUser(userId: number, roleId: number): Promise<boolean> {
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

    // Remove all existing roles for this user
    await this.userRoleRepository.removeAllRolesFromUser(userId);

    // Assign the new role
    await this.userRoleRepository.create({ userId, roleId });

    return true;
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: number, roleId: number): Promise<boolean> {
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

    return this.userRoleRepository.removeRole(userId, roleId);
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
