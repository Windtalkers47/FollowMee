import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService, TokenPayload } from '../services/auth.service';
import emailService from '../services/email.service';
import auditService from '../services/audit.service';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { In } from 'typeorm';
import rateLimit from 'express-rate-limit';
import * as jwt from 'jsonwebtoken';

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      users?: {
        userId: number;
        email: string;
      };
    }
  }
}

class AuthController {
  private authService: AuthService;
  private userRepository = AppDataSource.getRepository(User);
  private sessionRepository = AppDataSource.getRepository(UserSession);
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

      const { email, userPassword, userName, userLastName, userPhone1 } = req.body;

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({ 
        where: { userEmail: email } 
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }

      // Create new user
      const user = new User();
      user.userEmail = email;
      user.userName = userName;
      user.userLastName = userLastName || '';
      user.userPhone1 = userPhone1 || '';
      user.isActive = true;
      
      // Set the password - it will be hashed by the User entity's @BeforeInsert hook
      user.userPassword = userPassword;

      // Save user to database
      await this.userRepository.save(user);

      // Log the user in using auth service
      const result = await this.authService.login(email, userPassword, req, res);

      // Don't send back the password
      const { userPassword: _, ...userWithoutPassword } = user;

      return res.status(201).json({
        success: true,
        data: userWithoutPassword,
        message: 'Registration successful'
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
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
        select: ['userId', 'userEmail', 'userName', 'userPassword', 'isActive']
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
      
      // Don't send back the password
      const { userPassword, ...userWithoutPassword } = user;

      // Return success response with user data
      return res.status(200).json({
        success: true,
        data: userWithoutPassword,
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
          { refreshToken, isActive: true },
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
        select: ['userId', 'userEmail', 'userName', 'userLastName', 'userPhone1', 'isActive']
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: user
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

      if (user) {
        // Generate reset token (in a real app, you would send this via email)
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

        // Send password reset email
        await emailService.sendPasswordResetEmail(email, resetToken);
      }

      // Always return success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
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