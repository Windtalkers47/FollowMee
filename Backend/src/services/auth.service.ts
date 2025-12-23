import AppDataSource from '../config/database';
import { User } from '../entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const COOKIE_EXPIRES_IN_DAYS = parseInt(process.env.COOKIE_EXPIRES_IN_DAYS || '7', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Generate a JWT token for a user
   */
  private generateToken(user: User): string {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    return jwt.sign(
      { 
        userId: user.userId, 
        email: user.userEmail,
        // Default to 'user' role if not specified
        role: 'user'
      },
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRES_IN,
        algorithm: 'HS256'  // Explicitly specify the algorithm
      } as jwt.SignOptions
    );
  }

  /**
   * Set JWT token in an HTTP-only cookie
   */
  setAuthCookie(res: Response, token: string): void {
    const expiresInMs = COOKIE_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresInMs,
      path: '/',
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
  async login(email: string, password: string, res: Response) {
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

    const token = this.generateToken(user);
    this.setAuthCookie(res, token);

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
        'userRole',
        'isActive', 
        'createdAt'
      ]
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
