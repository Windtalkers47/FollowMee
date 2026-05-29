import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  connect(userId: number) {
    if (this.socket?.connected) {
      return;
    }

    let wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    
    // Convert HTTP to WebSocket protocol for production
    // Socket.IO can handle HTTP URLs, but we ensure proper protocol
    if (wsUrl.startsWith('https://')) {
      // Socket.IO will automatically use wss:// for secure connections
      wsUrl = wsUrl;
    } else if (wsUrl.startsWith('http://')) {
      // Socket.IO will automatically use ws:// for non-secure connections
      wsUrl = wsUrl;
    }

    this.socket = io(wsUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Join user's personal room
      this.socket?.emit('user:join', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(userId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.attemptReconnect(userId);
    });
  }

  private attemptReconnect(userId: number) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(userId);
      }, this.reconnectDelay);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.emit('user:leave');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onNotificationNew(callback: (data: any) => void) {
    this.socket?.on('notification:new', callback);
  }

  onNotificationUnreadCount(callback: (data: { count: number }) => void) {
    this.socket?.on('notification:unread_count', callback);
  }

  offNotificationNew(callback: (data: any) => void) {
    this.socket?.off('notification:new', callback);
  }

  offNotificationUnreadCount(callback: (data: { count: number }) => void) {
    this.socket?.off('notification:unread_count', callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const webSocketService = new WebSocketService();
