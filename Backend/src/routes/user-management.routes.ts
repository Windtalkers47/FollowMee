import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { checkPermission, checkAnyPermission } from '../middleware/permission.middleware';
import { UserManagementController } from '../controllers/user-management.controller';
import { UserService } from '../services/user.service';

// Manual dependency injection
const userService = new UserService();
const userManagementController = new UserManagementController(userService);

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

// User management routes - require VIEW_USERS permission
router.get('/users', checkPermission('VIEW_USERS'), (req, res) => userManagementController.getAllUsers(req, res));
router.get('/users/:id', checkPermission('VIEW_USERS'), (req, res) => userManagementController.getUserById(req, res));

// User role assignment - require MANAGE_ROLES or UPDATE_USERS permission
router.post('/users/assign-role', checkAnyPermission(['MANAGE_ROLES', 'UPDATE_USERS']), (req, res) => userManagementController.assignRoleToUser(req, res));
router.post('/users/remove-role', checkAnyPermission(['MANAGE_ROLES', 'UPDATE_USERS']), (req, res) => userManagementController.removeRoleFromUser(req, res));

// Role management routes - require MANAGE_ROLES permission
router.get('/roles', checkAnyPermission(['MANAGE_ROLES', 'UPDATE_USERS']), (req, res) => userManagementController.getAllRoles(req, res));
router.get('/roles/:id', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.getRoleById(req, res));
router.post('/roles', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.createRole(req, res));
router.put('/roles/:id', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.updateRole(req, res));

// Role-Permission management routes - require MANAGE_ROLES permission
router.post('/roles/assign-permission', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.assignPermissionToRole(req, res));
router.post('/roles/remove-permission', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.removePermissionFromRole(req, res));

export default router;
