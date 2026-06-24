import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private broadcastChannel: BroadcastChannel | null = null;

  connect(userId: number) {
    if (this.socket?.connected) {
      return;
    }

    // Initialize Broadcast Channel for cross-tab communication
    this.initBroadcastChannel();

    let wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    
    // Convert HTTP to WebSocket for production
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

  /**
   * Initialize Broadcast Channel for cross-tab communication
   * This ensures all tabs receive updates even if they're not the active tab
   */
  private initBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[WebSocket] BroadcastChannel is not supported in this browser');
      return;
    }

    this.broadcastChannel = new BroadcastChannel('followmee_updates');
    this.broadcastChannel.onmessage = (event) => {
      // Forward broadcast messages to WebSocket listeners
      // This is handled by individual page listeners
    };
  }

  /**
   * Post message to all tabs via Broadcast Channel
   */
  private broadcastToTabs(type: string, data: any) {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type, data });
    }
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

  /**
   * Listen for profile update events
   * Triggered when a user updates their profile (e.g., profile image)
   * This works across all tabs via Broadcast Channel
   */
  onProfileUpdated(callback: (data: { userId: number; userImageUrl?: string | null }) => void) {
    // Listen to WebSocket events
    const wsHandler = (data: { userId: number; userImageUrl?: string | null }) => {
      // Broadcast to all other tabs
      this.broadcastToTabs('profile:updated', data);
      callback(data);
    };
    
    this.socket?.on('profile:updated', wsHandler);

    // Also listen to Broadcast Channel (for updates from other tabs)
    const bcHandler = (event: MessageEvent) => {
      if (event.data.type === 'profile:updated') {
        callback(event.data.data);
      }
    };

    if (this.broadcastChannel) {
      this.broadcastChannel.addEventListener('message', bcHandler);
    }

    // Store handlers for cleanup
    (callback as any).__wsHandler = wsHandler;
    (callback as any).__bcHandler = bcHandler;
  }

  offNotificationNew(callback: (data: any) => void) {
    this.socket?.off('notification:new', callback);
  }

  offNotificationUnreadCount(callback: (data: { count: number }) => void) {
    this.socket?.off('notification:unread_count', callback);
  }

  /**
   * Remove listener for profile update events
   */
  offProfileUpdated(callback: (data: { userId: number; userImageUrl?: string | null }) => void) {
    const wsHandler = (callback as any).__wsHandler;
    const bcHandler = (callback as any).__bcHandler;
    
    if (wsHandler) {
      this.socket?.off('profile:updated', wsHandler);
    }
    
    if (bcHandler && this.broadcastChannel) {
      this.broadcastChannel.removeEventListener('message', bcHandler);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Close the broadcast channel when no longer needed
   */
  closeBroadcastChannel() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}

export const webSocketService = new WebSocketService();
