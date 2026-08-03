import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { UserProfileUpdatedEvent } from '../types/profile-event.types';
import { normalizeRoles } from '../utils/role.util';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: number;
    email?: string;
    roles?: string[];
  };
}

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, item) => {
    const separatorIndex = item.indexOf('=');
    if (separatorIndex < 0) return cookies;
    const key = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
};

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<number, Set<string>> = new Map(); // userId -> Set of socketIds

  initialize(io: SocketIOServer) {
    this.io = io;

    io.use((socket, next) => {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('WebSocket authentication is unavailable'));
      }

      const accessToken = parseCookies(socket.handshake.headers.cookie).access_token;
      if (!accessToken) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(accessToken, secret) as JwtPayload;
        const userId = Number(decoded.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
          return next(new Error('Invalid authentication token'));
        }

        socket.data.userId = userId;
        socket.data.email = decoded.email;
        socket.data.roles = normalizeRoles(Array.isArray(decoded.roles) ? decoded.roles : []);
        next();
      } catch {
        next(new Error('Invalid or expired authentication token'));
      }
    });

    io.on('connection', (rawSocket: Socket) => {
      const socket = rawSocket as AuthenticatedSocket;
      const userId = socket.data.userId;
      console.log('Client connected:', socket.id);

      socket.join(`user:${userId}`);
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);
      console.log(`User ${userId} joined with socket ${socket.id}`);

      socket.on('user:leave', () => {
        socket.leave(`user:${userId}`);
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
        console.log(`User ${userId} left with socket ${socket.id}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) this.userSockets.delete(userId);
        }
      });
    });
  }

  /**
   * Emit notification to a specific user
   */
  emitNotificationToUser(userId: number, data: any) {
    if (!this.io) return;
    
    this.io.to(`user:${userId}`).emit('notification:new', data);
    console.log(`Notification sent to user ${userId}`);
  }

  /**
   * Emit unread count update to a specific user
   */
  emitUnreadCount(userId: number, count: number) {
    if (!this.io) return;
    
    this.io.to(`user:${userId}`).emit('notification:unread_count', { count });
    console.log(`Unread count ${count} sent to user ${userId}`);
  }

  /**
   * Emit notification to multiple users
   */
  emitNotificationToUsers(userIds: number[], data: any) {
    if (!this.io) return;
    
    userIds.forEach(userId => {
      this.emitNotificationToUser(userId, data);
    });
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(event: string, data: any) {
    if (!this.io) return;
    
    this.io.emit(event, data);
  }

  emitDomainEvent(event: string, data: any, userIds?: number[]) {
    if (!this.io) return;

    if (!userIds || userIds.length === 0) {
      this.io.emit(event, data);
      return;
    }

    [...new Set(userIds)].forEach(userId => {
      this.io!.to(`user:${userId}`).emit(event, data);
    });
  }

  /**
   * Emit profile update event to a specific user
   * Used when user updates their profile (e.g., profile image)
   */
  emitProfileUpdate(userId: number, data: UserProfileUpdatedEvent) {
    if (!this.io) return;
    
    this.io.to(`user:${userId}`).emit('profile:updated', data);
    console.log(`Profile update event sent to user ${userId}`);
  }

  /**
   * Broadcast profile update to all users (for leaderboard refresh)
   */
  broadcastProfileUpdate(data: UserProfileUpdatedEvent) {
    if (!this.io) return;
    
    this.io.emit('profile:updated', data);
    console.log(`Profile update broadcast to all users for user ${data.userId}`);
  }

  /**
   * Check if a user is currently connected
   */
  isUserOnline(userId: number): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get number of active connections for a user
   */
  getUserConnectionCount(userId: number): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
