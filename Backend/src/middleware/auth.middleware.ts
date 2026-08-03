import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { normalizeRoles } from '../utils/role.util';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { authCookieOptions } from '../config/security.config';

// Fail fast: JWT_SECRET is required for production security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required. ' +
    'Please set JWT_SECRET in your .env file. ' +
    'For development, you can use a random string like: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        roles: string[];
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
        roles: normalizeRoles(decoded.roles || [])
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
        select: ['userId', 'userEmail', 'isActive'],
        relations: ['userRoles', 'userRoles.role']
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or account is inactive');
      }

      const roles = user.userRoles.map(ur => ur.role.roleName);

      // Generate new access token
      const newAccessToken = jwt.sign(
        { 
          userId: user.userId, 
          email: user.userEmail, 
          roles
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Update session expiration
      session.expiresAt = new Date(Date.now() + oneDayInMs);
      await sessionRepository.save(session);

      // Set new access token cookie
      res.cookie('access_token', newAccessToken, {
        ...authCookieOptions('/'),
        maxAge: oneDayInMs,
      });

      // Attach user to request
      req.user = {
        userId: user.userId,
        email: user.userEmail,
        roles
      };

      return next();
    }

    throw new Error('Invalid or expired session');
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Clear invalid cookies
    res.clearCookie('access_token', authCookieOptions('/'));
    res.clearCookie('refresh_token', authCookieOptions('/api'));
    
    return res.status(401).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      requiresLogin: true
    });
  }
};

// Alias for backward compatibility
export const authenticateToken = isAuthenticated;
