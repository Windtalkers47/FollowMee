import { Request, Response } from 'express';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import auditService from './audit.service';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Shorter-lived access token
const REFRESH_TOKEN_EXPIRES_IN_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;

// Types
export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  sessionId?: string;
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private sessionRepository = AppDataSource.getRepository(UserSession);
  
  /**
   * Check if user account is locked
   */
  private async isAccountLocked(user: User): Promise<boolean> {
    if (!user.lockedUntil) return false;
    return new Date() < user.lockedUntil;
  }
  
  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(user: User): Promise<void> {
    const now = new Date();
    const lastAttempt = user.lastLoginAttempt || now;
    const lockoutWindow = new Date(now.getTime() - LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000);
    
    // Reset attempts if outside the login attempt window
    if (lastAttempt < lockoutWindow) {
      user.loginAttempts = 1;
    } else {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account if max attempts reached
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockoutTime = new Date();
        lockoutTime.setMinutes(lockoutTime.getMinutes() + LOCKOUT_MINUTES);
        user.lockedUntil = lockoutTime;
      }
    }
    
    user.lastLoginAttempt = now;
    await this.userRepository.save(user);
  }
  
  /**
   * Reset login attempts on successful login
   */
  private async resetLoginAttempts(user: User): Promise<void> {
    user.loginAttempts = 0;
    user.lastLoginAttempt = null;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    await this.userRepository.save(user);
  }

  /**
   * Generate a JWT token for a user
   */
  private generateAccessToken(payload: TokenPayload): string {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    return jwt.sign(
      payload,
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRES_IN,
        algorithm: 'HS256'
      } as jwt.SignOptions
    );
  }
  
  /**
   * Generate a refresh token and save to database
   */
  private async generateRefreshToken(userId: number, req: Request): Promise<string> {
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);
    
    const session = this.sessionRepository.create({
      userId,
      refreshToken,
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip,
      expiresAt,
    });
    
    await this.sessionRepository.save(session);
    return refreshToken;
  }

  /**
   * Set auth cookies (access token and refresh token)
   */
  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const accessTokenExpiresInMs = 15 * 60 * 1000; // 15 minutes
    const refreshTokenExpiresInMs = REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
    
    // Access token (short-lived)
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: accessTokenExpiresInMs,
      path: '/',
    });
    
    // Refresh token (long-lived)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshTokenExpiresInMs,
      path: '/api/auth/refresh-token',
    });
  }

  /**
   * Clear the auth cookie
   */
  clearAuthCookie(res: Response): void {
    res.clearCookie('token', {
      path: '/',
    });
  }

  /**
   * Login user and set auth cookie
   */
  async login(email: string, password: string, req: Request, res: Response) {
    const user = await this.userRepository.findOne({ 
      where: { userEmail: email },
      select: [
        'userId', 
        'userEmail', 
        'userPassword', 
        'userName', 
        'userLastName', 
        'isActive',
        'createdAt',
        'updatedAt',
        'userPhone1',
        'userPhone2'
      ]
    });
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.userPassword);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateAccessToken({
      userId: user.userId,
      email: user.userEmail,
      role: user.role || 'user'
    });
    const refreshToken = await this.generateRefreshToken(user.userId, req);
    this.setAuthCookies(res, token, refreshToken);

    // Don't return password in the response
    const { userPassword, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: number) {
    const user = await this.userRepository.findOne({ 
      where: { userId },
      select: [
        'userId', 
        'userName', 
        'userLastName', 
        'userEmail', 
        'userPhone1', 
        'role',
        'isActive', 
        'createdAt'
      ] as (keyof User)[]
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  /**
   * Logout user by clearing the auth cookie
   */
  logout(res: Response): void {
    this.clearAuthCookie(res);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: number; email: string; role: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: number; email: string; role: string };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

export default new AuthService();
