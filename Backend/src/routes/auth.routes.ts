import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import AuthController from '../controllers/auth.controller';

const router = Router();

// Public routes
router.post('/login', AuthController.login);

// Protected routes
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
