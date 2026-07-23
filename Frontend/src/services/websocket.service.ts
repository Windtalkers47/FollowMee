import { io, Socket } from 'socket.io-client';
import { TOKEN_REFRESH_EVENT, emitTokenRefreshEvent } from '../store/slices/authSlice';

/**
 * WebSocket Service with Auto-Reconnect and Heartbeat
 * 
 * P1-WEBSOCKET: Enhanced with exponential backoff reconnection
 * P1-HEARTBEAT: Added heartbeat/ping-pong mechanism
 * U1-RECONNECT: Token Refresh Integration
 */
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000; // 30 seconds
  private broadcastChannel: BroadcastChannel | null = null;
  private heartbeatInterval: number | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private userId: number | null = null;
  private tokenRefreshListener: ((event: Event) => void) | null = null;

  /**
   * Connect to WebSocket server
   * U1-RECONNECT: Sets up token refresh listener
   */
  connect(userId: number) {
    if (this.socket?.connected) {
      this.userId = userId;
      return;
    }

    this.userId = userId;

    // Initialize Broadcast Channel for cross-tab communication
    this.initBroadcastChannel();

    // Set up token refresh listener (U1-RECONNECT: Token Refresh Integration)
    this.setupTokenRefreshListener();

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
      reconnection: false, // We handle reconnection manually with exponential backoff
      reconnectionDelay: this.baseReconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      
      // Join user's personal room
      this.socket?.emit('user:join', userId);
      
      // Start heartbeat
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Disconnected: ${reason}`);
      this.stopHeartbeat();
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error(`[WebSocket] Connection error: ${error.message}`);
      this.stopHeartbeat();
      this.attemptReconnect();
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });
  }

  /**
   * Start heartbeat mechanism to detect stale connections
   * P1-HEARTBEAT: Ping-pong every 30 seconds
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.socket?.connected) {
        // Socket.IO has built-in ping, but we can also emit a custom heartbeat
        this.socket.emit('ping', { timestamp: Date.now() });
        console.log('[WebSocket] Heartbeat sent');
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
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

  /**
   * Attempt to reconnect with exponential backoff
   * P1-WEBSOCKET: Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s, 30s, ...)
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[WebSocket] Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with max delay
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userId !== null) {
        this.connect(this.userId);
      }
    }, delay);
  }

  /**
   * Disconnect from WebSocket server
   * U1-RECONNECT: Cleans up token refresh listener
   */
  disconnect() {
    console.log('[WebSocket] Disconnecting manually');
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    
    // Clean up token refresh listener
    this.removeTokenRefreshListener();
    
    if (this.socket) {
      this.socket.emit('user:leave');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.userId = null;
  }

  /**
   * Set up token refresh listener (U1-RECONNECT: Token Refresh Integration)
   * 
   * When token is refreshed, reconnect WebSocket with new token
   */
  private setupTokenRefreshListener(): void {
    // Remove existing listener if any
    this.removeTokenRefreshListener();

    // Create new listener
    this.tokenRefreshListener = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[WebSocket] Token refresh event received', customEvent.detail);
      
      // Reconnect WebSocket with new token
      if (this.userId !== null) {
        console.log('[WebSocket] Reconnecting after token refresh...');
        this.disconnect();
        setTimeout(() => {
          this.connect(this.userId!);
        }, 1000);
      }
    };

    // Listen for token refresh event
    window.addEventListener(TOKEN_REFRESH_EVENT, this.tokenRefreshListener);
  }

  /**
   * Remove token refresh listener
   */
  private removeTokenRefreshListener(): void {
    if (this.tokenRefreshListener) {
      window.removeEventListener(TOKEN_REFRESH_EVENT, this.tokenRefreshListener);
      this.tokenRefreshListener = null;
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
   * Get current connection status with additional info
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    hasHeartbeat: boolean;
  } {
    return {
      connected: this.socket?.connected || false,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      hasHeartbeat: this.heartbeatInterval !== null,
    };
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
