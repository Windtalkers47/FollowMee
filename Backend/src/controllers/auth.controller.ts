import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService, TokenPayload } from '../services/auth.service';
import { emailService } from '../services/email.service';
import auditService from '../services/audit.service';
import { hashSessionToken } from '../utils/session-token.util';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { Role } from '../entities/Role';
import { UserRole } from '../entities/UserRole';
import { In } from 'typeorm';
import rateLimit from 'express-rate-limit';
import * as jwt from 'jsonwebtoken';
import { invitationService } from '../services/invitation.service';
import { registrationRequestService, validateRegistrationPolicy } from '../services/registration-request.service';

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

class AuthController {
  private authService: AuthService;
  private userRepository = AppDataSource.getRepository(User);
  private sessionRepository = AppDataSource.getRepository(UserSession);
  private roleRepository = AppDataSource.getRepository(Role);
  private userRoleRepository = AppDataSource.getRepository(UserRole);
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

  constructor() {
    this.authService = new AuthService();
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
  }
  
  /**
   * Apply rate limiting to login route
   */
  get loginRateLimiter() {
    return loginLimiter;
  }

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email, userPassword, userName, userLastName, userPhone1, invitationToken } = req.body;
      const publicRegistrationAllowed = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';
      const invitation = invitationToken
        ? await invitationService.validate(String(invitationToken))
        : null;
      if (!invitation && !publicRegistrationAllowed) {
        return res.status(403).json({ success: false, message: 'An invitation is required', code: 'INVITATION_REQUIRED' });
      }
      if (!invitation) {
        const pending = await registrationRequestService.submit(req.body, { ip: req.ip, userAgent: req.headers['user-agent'] });
        return res.status(202).json({ success: true, data: pending, code: 'REGISTRATION_PENDING_EMAIL', message: 'Check your email to continue registration' });
      }
      if (invitation && invitation.email.toLowerCase() !== String(email).trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Email must match the invitation', code: 'INVITATION_EMAIL_MISMATCH' });
      }
      if (invitation) {
        const policy = validateRegistrationPolicy(req.body);
        if (policy === 'required') return res.status(400).json({ success: false, message: 'Policy acceptance is required', code: 'POLICY_ACCEPTANCE_REQUIRED' });
        if (policy === 'outdated') return res.status(409).json({ success: false, message: 'Policy version is outdated', code: 'POLICY_VERSION_OUTDATED' });
      }

      // Check if user already exists (active or inactive)
      const existingUser = await this.userRepository.findOne({ 
        where: { userEmail: email } 
      });

      if (existingUser && existingUser.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }

      let user: User;
      
      if (existingUser && !existingUser.isActive) {
        // Reactivate existing inactive user
        user = existingUser;
        user.userName = userName;
        user.userLastName = userLastName || '';
        user.userPhone1 = userPhone1 || '';
        user.isActive = true;
        user.userPassword = userPassword; // Will be hashed by @BeforeUpdate hook
      } else {
        // Create new user
        user = new User();
        user.userEmail = email;
        user.userName = userName;
        user.userLastName = userLastName || '';
        user.userPhone1 = userPhone1 || '';
        user.isActive = true;
        user.userPassword = userPassword; // Will be hashed by @BeforeInsert hook
      }

      // Save user to database
      const savedUser = await this.userRepository.save(user);

      // Public registration must never be allowed to elevate its own privileges.
      // Higher roles are assigned only through authenticated user management.
      try {
        const targetRole = 'Member';

        let role = invitation?.roleId
          ? await this.roleRepository.findOne({ where: { roleId: invitation.roleId, isActive: true } })
          : await this.roleRepository.findOne({ where: [{ roleName: targetRole }, { roleName: 'Customer' }] });

        if (!role) {
          // Create role if it doesn't exist
          const roleConfigs = {
            'Owner': {
              description: '🔥 Super Administrator - Complete system control. Can manage everything including users, roles, permissions, and all system settings. Only one allowed.', 
              roleLevel: 999 
            },
            'Admin': { 
              description: '⚙️ Administrator - Can manage users, customers, tasks, and system settings. Cannot manage roles or permissions.', 
              roleLevel: 100 
            },
            'Moderator': { 
              description: '🛡️ Moderator - Can view and moderate users, customers, and tasks. Perfect for content moderation and basic user management.', 
              roleLevel: 50 
            },
            'Member': {
              description: 'Organization member with standard day-to-day access.',
              roleLevel: 1 
            }
          };

          const config = roleConfigs[targetRole] || roleConfigs['Moderator'];
          role = this.roleRepository.create({
            roleName: targetRole,
            description: config.description,
            roleLevel: config.roleLevel,
            isActive: true
          });
          role = await this.roleRepository.save(role);
        }

        // For reactivated users, remove all existing roles and assign the new one
        // For new users, just assign the role
        if (existingUser && !existingUser.isActive) {
          // Remove all existing roles for reactivated user
          await this.userRoleRepository
            .createQueryBuilder()
            .delete()
            .where('userId = :userId', { userId: savedUser.userId })
            .execute();
        } else {
          // For new users or already active users, also ensure only one role
          // This handles edge cases where user might have existing roles
          const existingRoles = await this.userRoleRepository
            .createQueryBuilder()
            .select('COUNT(*)')
            .where('userId = :userId', { userId: savedUser.userId })
            .getRawOne();
          
          if (parseInt(existingRoles['COUNT(*)']) > 0) {
            // Remove all existing roles to ensure clean state
            await this.userRoleRepository
              .createQueryBuilder()
              .delete()
              .where('userId = :userId', { userId: savedUser.userId })
              .execute();
          }
        }

        // Assign the new role
        const userRole = this.userRoleRepository.create({
          userId: savedUser.userId,
          roleId: role.roleId
        });
        await this.userRoleRepository.save(userRole);
        if (invitation) {
          await registrationRequestService.recordAcceptedPolicy(savedUser.userId, req.body, 'registration_invite');
          await invitationService.accept(invitation.invitationId);
        }
      } catch (roleError) {
        throw roleError;
      }

      // Log the user in using auth service
      const result = await this.authService.login(email, userPassword, req, res);

      // Don't send back the password
      const { userPassword: _, ...userWithoutPassword } = savedUser;

      const isReactivation = existingUser && !existingUser.isActive;
      
      return res.status(201).json({
        success: true,
        data: userWithoutPassword,
        message: isReactivation ? 'Account reactivated successfully' : 'Registration successful'
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return res.status(Number(error?.statusCode) || 500).json({
        success: false,
        message: 'Registration failed',
        ...(error?.code ? { code: error.code } : {}),
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Login user with email and password
   * Sets an HTTP-only cookie with JWT token on successful login
   */
  login = async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await this.userRepository.findOne({ 
        where: { userEmail: email },
        select: ['userId', 'userEmail', 'userName', 'userLastName', 'userPassword', 'userImageUrl', 'isActive']
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password using the User entity's verifyPassword method
      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }
      
      // Use auth service to handle login (includes token generation and cookie setting)
      const result = await this.authService.login(email, password, req, res);
      
      const { user: userData, roles, permissions } = result;

      // Return success response with user data
      return res.status(200).json({
        success: true,
        data: {
          userId: userData.userId,
          userName: userData.userName,
          userEmail: userData.userEmail,
          userImageUrl: userData.userImageUrl,
          roles,
          permissions,
          fullName: `${userData.userName} ${userData.userLastName}`.trim()
        },
        message: 'Login successful'
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed'
      });
    }
  }

  /**
   * Logout user by clearing the auth cookie
      });
    }
  }

  /**
   * Logout user and clear session
   */
  logout = async (req: Request, res: Response) => {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies?.refresh_token;
      
      if (refreshToken) {
        // Revoke the refresh token
        await this.sessionRepository.update(
          { refreshTokenHash: hashSessionToken(refreshToken), isActive: true },
          { isActive: false, revokedAt: new Date() }
        );
        
        // Log the logout
        if (req.user) {
          await auditService.logEvent({
            userId: req.user.userId,
            action: 'LOGOUT',
            status: 'SUCCESS',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        }
      }
      
      // Clear auth cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      await auditService.logEvent({
        userId: req.user?.userId || null,
        action: 'LOGOUT',
        status: 'FAILURE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      res.status(500).json({
        success: false,
        message: 'An error occurred during logout'
      });
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser = async (req: Request, res: Response) => {
    try {
      // The user should be attached to the request by the auth middleware
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      // Get fresh user data from database
      const user = await this.userRepository.findOne({
        where: { userId: req.user.userId },
        select: ['userId', 'userEmail', 'userName', 'userLastName', 'userPhone1', 'userImageUrl', 'isActive'],
        relations: ['userRoles', 'userRoles.role', 'userRoles.role.rolePermissions', 'userRoles.role.rolePermissions.permission']
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const roles = user.userRoles.map(ur => ur.role.roleName);
      const permissions = [...new Set(user.userRoles.flatMap(ur => ur.role.rolePermissions?.map(rp => rp.permission?.permissionName).filter(Boolean) || []))];

      return res.status(200).json({
        success: true,
        data: {
          userId: user.userId,
          userEmail: user.userEmail,
          userName: user.userName,
          userLastName: user.userLastName,
          userPhone1: user.userPhone1,
          userImageUrl: user.userImageUrl,
          isActive: user.isActive,
          roles,
          permissions,
          fullName: `${user.userName} ${user.userLastName}`.trim()
        }
      });
    } catch (error: any) {
      console.error('Get current user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get current user'
      });
    }
  }

  /**
   * Update user password
   */
  updatePassword = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      // Get user with password
      const user = await this.userRepository.findOne({
        where: { userId },
        select: ['userId', 'userPassword', 'userEmail', 'userName']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password using the User entity's verifyPassword method
      const isPasswordValid = await user.verifyPassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Set the new password - it will be hashed by the User entity's @BeforeUpdate hook
      user.userPassword = newPassword;
      await this.userRepository.save(user);

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error: any) {
      console.error('Update password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Request password reset
   */
  requestPasswordReset = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      // Find user by email
      const user = await this.userRepository.findOne({ 
        where: { userEmail: email } 
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address'
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { 
          userId: user.userId, 
          email: user.userEmail,
          type: 'password_reset'
        },
        this.JWT_SECRET + (user.userPassword || ''), // Invalidate when password changes
        { expiresIn: '1h' }
      );

      // Save the reset token to the user record
      user.resetToken = resetToken;
      user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
      await this.userRepository.save(user);

      // Send the reset email in the locale selected on the requesting device.
      const requestedLocale = String(req.headers['x-user-locale'] || '').toLowerCase();
      const locale: 'en' | 'th' = requestedLocale.startsWith('th') ? 'th' : 'en';
      await emailService.sendPasswordResetEmail(email, resetToken, locale);

      return res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email'
      });
    } catch (error: any) {
      console.error('Request password reset error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Reset password using a token
   */
  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
      }

      try {
        // First, find any user with this reset token
        const user = await this.userRepository.findOne({
          where: { resetToken: token }
        });

        if (!user) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or expired token'
          });
        }

        // Verify the token with the user's current password in the secret
        const decoded = jwt.verify(token, this.JWT_SECRET + (user.userPassword || '')) as { 
          userId: number; 
          email: string; 
          type: string;
          iat: number;
          exp: number;
        };
        
        if (decoded.type !== 'password_reset') {
          throw new Error('Invalid token type');
        }

        // Check if token is expired
        if (decoded.exp * 1000 < Date.now()) {
          // Clear the expired token
          user.resetToken = null;
          user.resetTokenExpires = null;
          await this.userRepository.save(user);
          
          return res.status(400).json({
            success: false,
            message: 'Token has expired. Please request a new password reset.'
          });
        }

        // Update password and clear reset token
        user.userPassword = newPassword; // The @BeforeUpdate hook will hash it
        user.resetToken = null;
        user.resetTokenExpires = null;
        await this.userRepository.save(user);

        return res.status(200).json({
          success: true,
          message: 'Password has been reset successfully'
        });
      } catch (error) {
        console.error('Token verification error:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error resetting password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}

export default new AuthController();
