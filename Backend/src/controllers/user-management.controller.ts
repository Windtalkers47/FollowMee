import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserManagementController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get all users with their roles
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const usersWithRoles = await this.userService.getAllManagedUsers();

      return res.json({
        success: true,
        data: usersWithRoles
      });
    } catch (error: unknown) {
      console.error('Error getting all users:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: errorMessage
      });
    }
  }

  /**
   * Get user by ID with roles and permissions
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }

      const user = await this.userService.getManagedUser(userId);
      return res.json({
        success: true,
        data: user
      });
    } catch (error: unknown) {
      console.error('Error getting user by ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: errorMessage
      });
    }
  }

  async getDeactivationImpact(req: Request, res: Response) {
    try { return res.json({ success: true, data: await this.userService.getDeactivationImpact(Number(req.params.id)) }); }
    catch (error) { const typed = error as { statusCode?: number; code?: string; message?: string }; return res.status(typed.statusCode || 500).json({ success: false, code: typed.code, message: typed.message || 'Failed to calculate impact' }); }
  }

  async deactivateWithTransfer(req: Request, res: Response) {
    try {
      const transferTo = req.body?.transferTo ? Number(req.body.transferTo) : null;
      const data = await this.userService.reassignAndDeactivate(Number(req.params.id), transferTo, req.user!.userId);
      return res.json({ success: true, data });
    } catch (error) { const typed = error as { statusCode?: number; code?: string; message?: string }; return res.status(typed.statusCode || 500).json({ success: false, code: typed.code, message: typed.message || 'Failed to deactivate user' }); }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(req: Request, res: Response) {
    try {
      const { userId, roleId } = req.body;

      if (!userId || !roleId) {
        return res.status(400).json({
          success: false,
          message: 'userId and roleId are required'
        });
      }

      const result = await this.userService.assignRoleToUser(Number(userId), Number(roleId), req.user?.userId);
      return res.json({
        success: true,
        message: 'Role assigned successfully',
        data: result
      });
    } catch (error: unknown) {
      console.error('Error assigning role to user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        error: errorMessage
      });
    }
  }

  async replaceUserRole(req: Request, res: Response) {
    try {
      const userId = Number(req.params.id);
      const roleId = Number(req.body.roleId);
      if (!Number.isInteger(userId) || !Number.isInteger(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid user ID and roleId are required',
        });
      }
      const user = await this.userService.assignRoleToUser(userId, roleId, req.user?.userId);
      return res.json({
        success: true,
        message: 'Role assigned successfully',
        data: user,
      });
    } catch (error: unknown) {
      console.error('Error replacing user role:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        error: errorMessage,
      });
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(req: Request, res: Response) {
    try {
      const { userId, roleId } = req.body;

      if (!userId || !roleId) {
        return res.status(400).json({
          success: false,
          message: 'userId and roleId are required'
        });
      }

      const result = await this.userService.removeRoleFromUser(userId, roleId, req.user?.userId);
      return res.json({
        success: true,
        message: 'Role removed successfully',
        data: { userId, roleId }
      });
    } catch (error: unknown) {
      console.error('Error removing role from user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to remove role',
        error: errorMessage
      });
    }
  }

  /**
   * Get all roles
   */
  async getAllRoles(req: Request, res: Response) {
    try {
      const roles = await this.userService.getAllRoles();
      return res.json({
        success: true,
        data: roles
      });
    } catch (error: unknown) {
      console.error('Error getting all roles:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch roles',
        error: errorMessage
      });
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const roleId = parseInt(id, 10);

      if (isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }

      const role = await this.userService.getRoleById(roleId);
      return res.json({
        success: true,
        data: role
      });
    } catch (error: unknown) {
      console.error('Error getting role by ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch role',
        error: errorMessage
      });
    }
  }

  /**
   * Create new role
   */
  async createRole(req: Request, res: Response) {
    try {
      const { roleName, description, roleLevel } = req.body;

      if (!roleName) {
        return res.status(400).json({
          success: false,
          message: 'roleName is required'
        });
      }

      const role = await this.userService.createRole({ roleName, description, roleLevel });
      return res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully'
      });
    } catch (error: unknown) {
      console.error('Error creating role:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: errorMessage
      });
    }
  }

  /**
   * Update role
   */
  async updateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const roleId = parseInt(id, 10);

      if (isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
      }

      const role = await this.userService.updateRole(roleId, req.body);
      return res.json({
        success: true,
        data: role,
        message: 'Role updated successfully'
      });
    } catch (error: unknown) {
      console.error('Error updating role:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: errorMessage
      });
    }
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(req: Request, res: Response) {
    try {
      const { roleId, permissionId } = req.body;

      if (!roleId || !permissionId) {
        return res.status(400).json({
          success: false,
          message: 'roleId and permissionId are required'
        });
      }

      const result = await this.userService.assignPermissionToRole(roleId, permissionId);
      return res.json({
        success: true,
        message: 'Permission assigned to role successfully',
        data: { roleId, permissionId }
      });
    } catch (error: unknown) {
      console.error('Error assigning permission to role:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to assign permission to role',
        error: errorMessage
      });
    }
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(req: Request, res: Response) {
    try {
      const { roleId, permissionId } = req.body;

      if (!roleId || !permissionId) {
        return res.status(400).json({
          success: false,
          message: 'roleId and permissionId are required'
        });
      }

      const result = await this.userService.removePermissionFromRole(roleId, permissionId);
      return res.json({
        success: true,
        message: 'Permission removed from role successfully',
        data: { roleId, permissionId }
      });
    } catch (error: unknown) {
      console.error('Error removing permission from role:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to remove permission from role',
        error: errorMessage
      });
    }
  }
}
