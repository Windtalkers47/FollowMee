import { Server as SocketIOServer, Socket } from 'socket.io';

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<number, Set<string>> = new Map(); // userId -> Set of socketIds

  initialize(io: SocketIOServer) {
    this.io = io;

    io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      // User joins their personal room
      socket.on('user:join', (userId: number) => {
        socket.join(`user:${userId}`);
        
        // Track socket for this user
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);
        
        console.log(`User ${userId} joined with socket ${socket.id}`);
      });

      // User leaves their personal room
      socket.on('user:leave', (userId: number) => {
        socket.leave(`user:${userId}`);
        
        // Remove socket tracking
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
        
        // Clean up socket from all users
        for (const [userId, sockets] of this.userSockets.entries()) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
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

  /**
   * Emit profile update event to a specific user
   * Used when user updates their profile (e.g., profile image)
   */
  emitProfileUpdate(userId: number, data: { userId: number; userImageUrl?: string | null }) {
    if (!this.io) return;
    
    this.io.to(`user:${userId}`).emit('profile:updated', data);
    console.log(`Profile update event sent to user ${userId}`);
  }

  /**
   * Broadcast profile update to all users (for leaderboard refresh)
   */
  broadcastProfileUpdate(data: { userId: number; userImageUrl?: string | null }) {
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
