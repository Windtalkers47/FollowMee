import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { UserRole } from '../entities/UserRole';
import { RolePermission } from '../entities/RolePermission';

/**
 * Utility functions for permission management and setup
 */

/**
 * Check current user permissions and role assignments
 */
async function checkPermissions() {
  try {
    await AppDataSource.initialize();

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    const rolePermissionRepo = AppDataSource.getRepository(RolePermission);

    const users = await userRepo.find();
    const roles = await roleRepo.find({ relations: ['rolePermissions', 'rolePermissions.permission'] });
    const permissions = await permissionRepo.find();
    const userRoles = await userRoleRepo.find({ relations: ['user', 'role'] });

    await AppDataSource.destroy();

    return {
      users: users.map(u => ({
        userId: u.userId,
        userName: u.userName,
        userLastName: u.userLastName,
        userEmail: u.userEmail,
        isActive: u.isActive
      })),
      roles: roles.map(r => ({
        roleId: r.roleId,
        roleName: r.roleName,
        description: r.description,
        roleLevel: r.roleLevel,
        isActive: r.isActive,
        permissions: r.rolePermissions.map(rp => rp.permission?.permissionName)
      })),
      permissions: permissions.map(p => ({
        permissionId: p.permissionId,
        permissionName: p.permissionName,
        description: p.description
      })),
      userRoles: userRoles.map(ur => ({
        userId: ur.user.userId,
        userEmail: ur.user.userEmail,
        roleId: ur.role.roleId,
        roleName: ur.role.roleName
      }))
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    throw error;
  }
}

/**
 * Setup basic roles and permissions for the system
 */
async function setupBasicPermissions() {
  try {
    await AppDataSource.initialize();

    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);
    const rolePermissionRepo = AppDataSource.getRepository(RolePermission);

    // Create basic permissions
    const permissions = [
      { permissionName: 'SYSTEM_ADMIN', description: 'Full system administration' },
      { permissionName: 'VIEW_USERS', description: 'View all users' },
      { permissionName: 'CREATE_USERS', description: 'Create new users' },
      { permissionName: 'UPDATE_USERS', description: 'Update user information' },
      { permissionName: 'DELETE_USERS', description: 'Delete users' },
      { permissionName: 'MANAGE_ROLES', description: 'Manage roles and permissions' },
      { permissionName: 'VIEW_CUSTOMERS', description: 'View all customers' },
      { permissionName: 'MANAGE_CUSTOMERS', description: 'Manage customers' },
      { permissionName: 'VIEW_TASKS', description: 'View tasks' },
      { permissionName: 'MANAGE_TASKS', description: 'Manage tasks' }
    ];

    for (const perm of permissions) {
      const existing = await permissionRepo.findOne({ where: { permissionName: perm.permissionName } });
      if (!existing) {
        await permissionRepo.save(perm);
      }
    }

    // Create Superadmin role
    let superadminRole = await roleRepo.findOne({ where: { roleName: 'Superadmin' } });
    if (!superadminRole) {
      superadminRole = roleRepo.create({
        roleName: 'Superadmin',
        description: 'System administrator with full access',
        roleLevel: 999,
        isActive: true
      });
      superadminRole = await roleRepo.save(superadminRole);
    }

    // Assign all permissions to Superadmin role
    const allPermissions = await permissionRepo.find();
    for (const permission of allPermissions) {
      const existing = await rolePermissionRepo.findOne({
        where: { roleId: superadminRole.roleId, permissionId: permission.permissionId }
      });
      if (!existing) {
        await rolePermissionRepo.save({
          roleId: superadminRole.roleId,
          permissionId: permission.permissionId
        });
      }
    }

    await AppDataSource.destroy();
    return { success: true, message: 'Basic permissions setup complete' };
  } catch (error) {
    console.error('Error setting up permissions:', error);
    throw error;
  }
}

/**
 * Grant Superadmin role to a user by email
 */
async function grantSuperadmin(email: string) {
  try {
    await AppDataSource.initialize();

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const userRoleRepo = AppDataSource.getRepository(UserRole);

    const user = await userRepo.findOne({ where: { userEmail: email } });
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    const superadminRole = await roleRepo.findOne({ where: { roleName: 'Superadmin' } });
    if (!superadminRole) {
      throw new Error('Superadmin role not found. Please run setup first.');
    }

    const existingAssignment = await userRoleRepo.findOne({
      where: { userId: user.userId, roleId: superadminRole.roleId }
    });

    if (!existingAssignment) {
      await userRoleRepo.save({
        userId: user.userId,
        roleId: superadminRole.roleId
      });
    }

    await AppDataSource.destroy();
    return { success: true, message: `Superadmin role granted to ${email}` };
  } catch (error) {
    console.error('Error granting Superadmin:', error);
    throw error;
  }
}

export { checkPermissions, setupBasicPermissions, grantSuperadmin };
