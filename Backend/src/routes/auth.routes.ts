import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { decryptRequestMiddleware } from '../middleware/requestDecryption.middleware';
import AuthController from '../controllers/auth.controller';
import { body } from 'express-validator';
import { InvitationController } from '../controllers/invitation.controller';

const router = Router();
const invitationController = new InvitationController();

// Public routes
router.get('/invitations/:token', invitationController.validate);
router.post(
  '/register',
  decryptRequestMiddleware,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('userPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('userName').notEmpty().withMessage('Username is required'),
    body('userLastName').notEmpty().withMessage('Last name is required')
  ],
  AuthController.register
);

router.post(
  '/login',
  decryptRequestMiddleware,
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
router.post('/forgot-password', decryptRequestMiddleware, AuthController.requestPasswordReset);
router.post('/reset-password', decryptRequestMiddleware, AuthController.resetPassword);
router.put('/update-password', authenticateToken, decryptRequestMiddleware, AuthController.updatePassword);

export default router;
