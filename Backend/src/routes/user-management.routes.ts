import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { checkPermission, checkAnyPermission, checkRole } from '../middleware/permission.middleware';
import { UserManagementController } from '../controllers/user-management.controller';
import { UserService } from '../services/user.service';
import { OwnerController } from '../controllers/owner.controller';
import { InvitationController } from '../controllers/invitation.controller';
import { RegistrationRequestController } from '../controllers/registration-request.controller';

// Manual dependency injection
const userService = new UserService();
const userManagementController = new UserManagementController(userService);
const ownerController = new OwnerController();
const invitationController = new InvitationController();
const registrationRequestController = new RegistrationRequestController();

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

// User management routes - require VIEW_USERS permission
router.get('/users', checkPermission('VIEW_USERS'), (req, res) => userManagementController.getAllUsers(req, res));
router.get('/users/:id', checkPermission('VIEW_USERS'), (req, res) => userManagementController.getUserById(req, res));
router.get('/users/:id/deactivation-impact', checkPermission('DELETE_USERS'), (req, res) => userManagementController.getDeactivationImpact(req, res));
router.post('/users/:id/deactivate', checkPermission('DELETE_USERS'), (req, res) => userManagementController.deactivateWithTransfer(req, res));
router.get('/system-owner', checkPermission('VIEW_USERS'), ownerController.getCurrent);
router.put('/system-owner', checkRole('Owner'), ownerController.transfer);
router.get('/invitations', checkPermission('CREATE_USERS'), invitationController.list);
router.post('/invitations', checkPermission('CREATE_USERS'), invitationController.create);
router.post('/invitations/:id/resend', checkPermission('CREATE_USERS'), invitationController.resend);
router.post('/invitations/:id/revoke', checkPermission('CREATE_USERS'), invitationController.revoke);
router.get('/registration-requests', checkRole('Owner'), registrationRequestController.list);
router.post('/registration-requests/:id/approve', checkRole('Owner'), registrationRequestController.approve);
router.post('/registration-requests/:id/reject', checkRole('Owner'), registrationRequestController.reject);

// User role assignment - require MANAGE_ROLES or UPDATE_USERS permission
router.post('/users/assign-role', checkAnyPermission(['MANAGE_ROLES', 'UPDATE_USERS']), (req, res) => userManagementController.assignRoleToUser(req, res));
/**
 * @swagger
 * /user-management/users/{id}/role:
 *   put:
 *     tags: [User Management]
 *     summary: Replace a user's single role transactionally
 *     responses:
 *       200: { description: Canonical user response with role and permissions }
 *       400: { description: Invalid user ID or role ID }
 */
router.put('/users/:id/role', checkAnyPermission(['MANAGE_ROLES', 'UPDATE_USERS']), (req, res) => userManagementController.replaceUserRole(req, res));
router.post('/users/remove-role', checkAnyPermission(['MANAGE_ROLES', 'UPDATE_USERS']), (req, res) => userManagementController.removeRoleFromUser(req, res));

// Role management routes - require MANAGE_ROLES permission
router.get('/roles', checkAnyPermission(['MANAGE_ROLES', 'UPDATE_USERS', 'CREATE_USERS']), (req, res) => userManagementController.getAllRoles(req, res));
router.get('/roles/:id', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.getRoleById(req, res));
router.post('/roles', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.createRole(req, res));
router.put('/roles/:id', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.updateRole(req, res));

// Role-Permission management routes - require MANAGE_ROLES permission
router.post('/roles/assign-permission', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.assignPermissionToRole(req, res));
router.post('/roles/remove-permission', checkPermission('MANAGE_ROLES'), (req, res) => userManagementController.removePermissionFromRole(req, res));

export default router;
