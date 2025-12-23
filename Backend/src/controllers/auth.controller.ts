import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import jwt from 'jsonwebtoken';

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
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = '24h';

  constructor() {
    this.authService = new AuthService();
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
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

      const { email, password, userName, userLastName, userPhone1 } = req.body;

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
      user.userPassword = password; // Will be hashed by the entity hook
      user.userName = userName;
      user.userLastName = userLastName || '';
      user.userPhone1 = userPhone1 || '';
      user.isActive = true;

      // Save user to database
      await this.userRepository.save(user);

      // Log the user in (set auth cookie)
      const token = this.generateToken(user);
      this.setAuthCookie(res, token);

      // Don't send back the password
      const { userPassword, ...userWithoutPassword } = user;

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

      // Authenticate user and get user data
      const userData = await this.authService.login(email, password, res);
      
      // Create a proper User instance
      const user = new User();
      Object.assign(user, userData);
      
      // Generate JWT token
      const token = this.generateToken(user);

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
   */
  logout = async (_req: Request, res: Response) => {
    try {
      res.clearCookie('token', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
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

      // Verify current password
      const isPasswordValid = await user.verifyPassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password (will be hashed by the entity hook)
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
   * Generate JWT token for a user
   */
  private generateToken = (user: User): string => {
    return jwt.sign(
      { 
        userId: user.userId, 
        email: user.userEmail,
        role: 'user' // Default role
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * Set authentication cookie
   */
  private setAuthCookie = (res: Response, token: string): void => {
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
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

        // In a real app, send email with reset link
        console.log(`Password reset token for ${email}:`, resetToken);
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
  }

  /**
   * Reset password using a token
   */
  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      // Find user by token
      const user = await this.userRepository.findOne({
        where: { resetToken: token }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Update password
      user.userPassword = newPassword;
      user.resetToken = undefined; // Use undefined instead of null
      await this.userRepository.save(user);

      return res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

}

export default new AuthController();