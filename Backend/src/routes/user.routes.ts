import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Initialize dependencies
const userService = new UserService();
const userController = new UserController(userService);

// All user routes require authentication
router.use(authenticateToken);

// Get all users
router.get('/', (req, res, next) => userController.getAllUsers(req, res, next));

// Get current user's profile
router.get('/me', (req, res, next) => userController.getProfile(req, res, next));

// Get user by ID
router.get('/:userId', (req, res, next) => userController.getUserById(req, res, next));

// Create new user (admin only)
router.post('/', (req, res, next) => userController.createUser(req, res, next));

// Update current user's profile
router.put('/me', (req, res, next) => userController.updateProfile(req, res, next));

// Update user by ID (admin only)
router.put('/:userId', (req, res, next) => userController.updateUser(req, res, next));

// Delete user (admin only)
router.delete('/:userId', (req, res, next) => userController.deleteUser(req, res, next));

// Change password
router.post('/change-password', (req, res, next) => userController.changePassword(req, res, next));

// Upload profile image
router.post('/upload-image', (req, res, next) => userController.uploadUserImage(req, res, next));

// Delete profile image
router.delete('/delete-image', (req, res, next) => userController.deleteUserImage(req, res, next));

export default router;
