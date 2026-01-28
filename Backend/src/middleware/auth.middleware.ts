import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
}

// Verify JWT token
const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware to check if user is authenticated (for protected routes)
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies?.access_token;
  const refreshToken = req.cookies?.refresh_token;
  const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // If no tokens are present
  if (!accessToken && !refreshToken) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Verify access token
    const decoded = verifyToken(accessToken);
    
    if (decoded) {
      // Token is valid, attach user to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user'
      };
      return next();
    }

    // If access token is invalid/expired but we have a refresh token
    if (refreshToken) {
      const sessionRepository = AppDataSource.getRepository(UserSession);
      const session = await sessionRepository.findOne({ 
        where: { refreshToken, isActive: true } 
      });

      // Check if session exists and is not expired
      if (!session || new Date() > session.expiresAt) {
        if (session) {
          // Expire the session
          session.isActive = false;
          session.revokedAt = new Date();
          await sessionRepository.save(session);
        }
        throw new Error('Session expired. Please log in again.');
      }

      // Get user data
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ 
        where: { userId: session.userId },
        select: ['userId', 'userEmail', 'role', 'isActive']
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or account is inactive');
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        { 
          userId: user.userId, 
          email: user.userEmail, 
          role: user.role || 'user' 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Update session expiration
      session.expiresAt = new Date(Date.now() + oneDayInMs);
      await sessionRepository.save(session);

      // Set new access token cookie
      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: oneDayInMs,
        path: '/',
      });

      // Attach user to request
      req.user = {
        userId: user.userId,
        email: user.userEmail,
        role: user.role || 'user'
      };

      return next();
    }

    throw new Error('Invalid or expired session');
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Clear invalid cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    
    return res.status(401).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      requiresLogin: true
    });
  }
};

// Alias for backward compatibility
export const authenticateToken = isAuthenticated;
