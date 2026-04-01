import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { UserRole } from '../entities/UserRole';
import { RolePermission } from '../entities/RolePermission';

/**
 * Utility to check and setup basic permissions for development
 */

async function checkPermissions() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    const rolePermissionRepo = AppDataSource.getRepository(RolePermission);

    // Check current users
    const users = await userRepo.find();
    console.log(`\n=== USERS (${users.length}) ===`);
    users.forEach(user => {
      console.log(`- ${user.userName} ${user.userLastName} (${user.userEmail}) - Active: ${user.isActive}`);
    });

    // Check roles
    const roles = await roleRepo.find({ relations: ['rolePermissions', 'rolePermissions.permission'] });
    console.log(`\n=== ROLES (${roles.length}) ===`);
    roles.forEach(role => {
      const permissions = role.rolePermissions.map(rp => rp.permission?.permissionName);
      console.log(`- ${role.roleName}: [${permissions.join(', ')}]`);
    });

    // Check permissions
    const permissions = await permissionRepo.find();
    console.log(`\n=== PERMISSIONS (${permissions.length}) ===`);
    permissions.forEach(perm => {
      console.log(`- ${perm.permissionName}: ${perm.description || 'No description'}`);
    });

    // Check user-role assignments
    const userRoles = await userRoleRepo.find({ relations: ['user', 'role'] });
    console.log(`\n=== USER ROLE ASSIGNMENTS ===`);
    userRoles.forEach(ur => {
      console.log(`- ${ur.user.userName} -> ${ur.role.roleName}`);
    });

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function setupBasicPermissions() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const roleRepo = AppDataSource.getRepository(Role);
    const permissionRepo = AppDataSource.getRepository(Permission);
    const rolePermissionRepo = AppDataSource.getRepository(RolePermission);

    // Create basic permissions
    const permissions = [
      { permissionName: 'VIEW_USERS', description: 'View all users' },
      { permissionName: 'MANAGE_ROLES', description: 'Manage roles and permissions' },
      { permissionName: 'UPDATE_USERS', description: 'Update user information' },
      { permissionName: 'DELETE_USERS', description: 'Delete users' },
      { permissionName: 'VIEW_CUSTOMERS', description: 'View all customers' },
      { permissionName: 'MANAGE_CUSTOMERS', description: 'Manage customers' },
      { permissionName: 'VIEW_TASKS', description: 'View tasks' },
      { permissionName: 'MANAGE_TASKS', description: 'Manage tasks' }
    ];

    for (const perm of permissions) {
      const existing = await permissionRepo.findOne({ where: { permissionName: perm.permissionName } });
      if (!existing) {
        await permissionRepo.save(perm);
        console.log(`Created permission: ${perm.permissionName}`);
      }
    }

    // Create admin role
    let adminRole = await roleRepo.findOne({ where: { roleName: 'Admin' } });
    if (!adminRole) {
      adminRole = roleRepo.create({
        roleName: 'Admin',
        description: 'System administrator with full access',
        roleLevel: 100,
        isActive: true
      });
      adminRole = await roleRepo.save(adminRole);
      console.log('Created Admin role');
    }

    // Assign all permissions to admin role
    const allPermissions = await permissionRepo.find();
    for (const permission of allPermissions) {
      const existing = await rolePermissionRepo.findOne({
        where: { roleId: adminRole.roleId, permissionId: permission.permissionId }
      });
      if (!existing) {
        await rolePermissionRepo.save({
          roleId: adminRole.roleId,
          permissionId: permission.permissionId
        });
        console.log(`Assigned ${permission.permissionName} to Admin role`);
      }
    }

    console.log('\nBasic permissions setup complete!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run based on command line argument
const command = process.argv[2];
if (command === 'setup') {
  setupBasicPermissions();
} else {
  checkPermissions();
}
