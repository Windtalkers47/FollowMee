import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import AuthController from '../controllers/auth.controller';
import { body } from 'express-validator';

const router = Router();

// Public routes
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').notEmpty().withMessage('Name is required')
  ],
  AuthController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').exists().withMessage('Password is required')
  ],
  AuthController.login
);

// Protected routes
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.post('/logout', authenticateToken, AuthController.logout);

// Password reset routes
router.post('/forgot-password', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPassword);
router.put('/update-password', authenticateToken, AuthController.updatePassword);

export default router;
