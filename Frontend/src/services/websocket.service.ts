import { io, Socket } from 'socket.io-client';
import { TOKEN_REFRESH_EVENT } from '../store/slices/authSlice';
import type { UserProfileUpdatedEvent } from '../types/profile-event.types';
import { WS_URL } from '../utils/runtimeEnv';

export type RealtimeConnectionState = 'connected' | 'reconnecting' | 'offline';
export type RealtimeConnectionSnapshot = { state: RealtimeConnectionState; lastUpdated: number | null; reconnectAttempts: number };

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
  private heartbeatInterval: number | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private userId: number | null = null;
  private tokenRefreshListener: ((event: Event) => void) | null = null;
  private domainListeners = new Map<string, Set<(data: unknown) => void>>();
  private statusListeners = new Set<(snapshot: RealtimeConnectionSnapshot) => void>();
  private status: RealtimeConnectionSnapshot = { state: navigator.onLine ? 'reconnecting' : 'offline', lastUpdated: null, reconnectAttempts: 0 };
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  private updateStatus(patch: Partial<RealtimeConnectionSnapshot>) {
    this.status = { ...this.status, ...patch };
    this.statusListeners.forEach(listener => listener(this.status));
  }

  /**
   * Connect to WebSocket server
   * U1-RECONNECT: Sets up token refresh listener
   */
  connect(userId: number) {
    if (this.socket) {
      this.userId = userId;
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    this.userId = userId;

    // Set up token refresh listener (U1-RECONNECT: Token Refresh Integration)
    this.setupTokenRefreshListener();
    this.setupConnectivityListeners();

    const wsUrl = WS_URL;

    this.socket = io(wsUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.baseReconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });
    this.domainListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => this.socket?.on(event, callback));
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.updateStatus({ state: 'connected', lastUpdated: Date.now(), reconnectAttempts: 0 });
      // Start heartbeat
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Disconnected: ${reason}`);
      this.stopHeartbeat();
      this.updateStatus({ state: navigator.onLine ? 'reconnecting' : 'offline' });
    });

    this.socket.on('connect_error', (error) => {
      console.error(`[WebSocket] Connection error: ${error.message}`);
      this.stopHeartbeat();
      this.reconnectAttempts += 1;
      this.updateStatus({ state: navigator.onLine ? 'reconnecting' : 'offline', reconnectAttempts: this.reconnectAttempts });
    });

    this.socket.io.on('reconnect', (attemptNumber: number) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.updateStatus({ state: 'connected', lastUpdated: Date.now(), reconnectAttempts: 0 });
      this.startHeartbeat();
    });
    this.socket.io.on('reconnect_attempt', (attemptNumber: number) => {
      this.updateStatus({ state: navigator.onLine ? 'reconnecting' : 'offline', reconnectAttempts: attemptNumber });
    });
    this.socket.onAny(() => this.updateStatus({ lastUpdated: Date.now() }));
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
    this.removeConnectivityListeners();
    
    if (this.socket) {
      this.socket.emit('user:leave');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.userId = null;
  }

  private setupConnectivityListeners(): void {
    if (this.onlineListener || this.offlineListener) return;
    this.onlineListener = () => {
      this.updateStatus({ state: this.socket?.connected ? 'connected' : 'reconnecting' });
      if (!this.socket?.connected) this.socket?.connect();
    };
    this.offlineListener = () => this.updateStatus({ state: 'offline' });
    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  private removeConnectivityListeners(): void {
    if (this.onlineListener) window.removeEventListener('online', this.onlineListener);
    if (this.offlineListener) window.removeEventListener('offline', this.offlineListener);
    this.onlineListener = null;
    this.offlineListener = null;
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
        this.socket?.disconnect();
        this.socket?.connect();
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

  onNotificationNew<T>(callback: (data: T) => void) {
    this.socket?.on('notification:new', callback);
  }

  onNotificationUnreadCount(callback: (data: { count: number }) => void) {
    this.socket?.on('notification:unread_count', callback);
  }

  onDomainEvent<T>(event: string, callback: (data: T) => void) {
    if (!this.domainListeners.has(event)) {
      this.domainListeners.set(event, new Set());
    }
    const callbacks = this.domainListeners.get(event)!;
    const normalized = callback as unknown as (data: unknown) => void;
    if (callbacks.has(normalized)) return;
    callbacks.add(normalized);
    this.socket?.on(event, callback);
  }

  offDomainEvent<T>(event: string, callback: (data: T) => void) {
    const callbacks = this.domainListeners.get(event);
    callbacks?.delete(callback as unknown as (data: unknown) => void);
    if (callbacks?.size === 0) {
      this.domainListeners.delete(event);
    }
    this.socket?.off(event, callback);
  }

  /**
   * Listen for profile update events
   * Triggered when a user updates their profile (e.g., profile image)
   * This works across all tabs via Broadcast Channel
   */
  onProfileUpdated(callback: (data: UserProfileUpdatedEvent) => void) {
    this.socket?.on('profile:updated', callback);
  }

  offNotificationNew<T>(callback: (data: T) => void) {
    this.socket?.off('notification:new', callback);
  }

  offNotificationUnreadCount(callback: (data: { count: number }) => void) {
    this.socket?.off('notification:unread_count', callback);
  }

  /**
   * Remove listener for profile update events
   */
  offProfileUpdated(callback: (data: UserProfileUpdatedEvent) => void) {
    this.socket?.off('profile:updated', callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  onStatusChange(callback: (snapshot: RealtimeConnectionSnapshot) => void) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => { this.statusListeners.delete(callback); };
  }

  getStatusSnapshot(): RealtimeConnectionSnapshot {
    return this.status;
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
    // Compatibility no-op. Each authenticated tab already owns a socket;
    // rebroadcasting server events caused duplicate profile updates.
  }
}

export const webSocketService = new WebSocketService();
