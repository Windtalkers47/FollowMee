import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

// Extend Express Request type to include permissions
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        roles: string[];
      };
      userPermissions?: string[];
    }
  }
}

export const checkPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user permissions
      const userService = new UserService();
      const userWithRoles = await userService.getUserWithRoles(req.user.userId);

      // Check if user has the required permission
      if (!userWithRoles.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: requiredPermission,
          userPermissions: userWithRoles.permissions
        });
      }

      // Attach permissions to request for later use
      req.userPermissions = userWithRoles.permissions;

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

export const checkAnyPermission = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user permissions
      const userService = new UserService();
      const userWithRoles = await userService.getUserWithRoles(req.user.userId);

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(permission =>
        userWithRoles.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: requiredPermissions,
          userPermissions: userWithRoles.permissions
        });
      }

      // Attach permissions to request for later use
      req.userPermissions = userWithRoles.permissions;

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

export const checkRole = (requiredRole: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user with roles
      const userService = new UserService();
      const userWithRoles = await userService.getUserWithRoles(req.user.userId);

      // Check if user has the required role
      if (!userWithRoles.roles.includes(requiredRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient role',
          required: requiredRole,
          userRoles: userWithRoles.roles
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking role'
      });
    }
  };
};
