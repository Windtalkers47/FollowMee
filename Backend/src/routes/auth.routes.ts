import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { decryptRequestMiddleware } from '../middleware/requestDecryption.middleware';
import AuthController from '../controllers/auth.controller';
import { body } from 'express-validator';
import { InvitationController } from '../controllers/invitation.controller';
import { RegistrationRequestController } from '../controllers/registration-request.controller';
import rateLimit from 'express-rate-limit';

const router = Router();
const invitationController = new InvitationController();
const registrationRequestController = new RegistrationRequestController();
const registrationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

// Public routes
router.get('/invitations/:token', invitationController.validate);
router.get('/registration-requests/verify', registrationRequestController.verify);
router.post('/registration-requests/resend-verification', registrationLimiter, registrationRequestController.resend);
router.post(
  '/register',
  registrationLimiter,
  decryptRequestMiddleware,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('userPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('userName').notEmpty().withMessage('Username is required'),
    body('userLastName').notEmpty().withMessage('Last name is required')
    ,body('termsAccepted').custom(value => value === true).withMessage('Terms acceptance is required')
    ,body('privacyAccepted').custom(value => value === true).withMessage('Privacy acceptance is required')
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
