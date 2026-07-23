import { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL } from '../api/config';
import { 
  subscribeToPush, 
  unsubscribeFromPush, 
  getVapidPublicKey,
  checkPushAvailability,
  getNotificationPermission,
  requestNotificationPermission,
} from '../api/notification.api';

interface UsePushNotificationResult {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  permission: NotificationPermission;
  permissionDenied: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermission>;
}

/**
 * Hook for managing push notification subscriptions
 * NEW-PUSH: Browser Push Notification Hook
 */
export function usePushNotification(): UsePushNotificationResult {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check if service workers are supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setIsSupported(false);
          console.log('[Push] Push notifications not supported');
          return;
        }

        // Check if push is available on backend
        const result = await checkPushAvailability();
        setIsSupported(result.data?.available ?? false);
      } catch (err) {
        console.error('[Push] Error checking support:', err);
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  // Check notification permission status
  useEffect(() => {
    const perm = getNotificationPermission();
    setPermission(perm);
    setPermissionDenied(perm === 'denied');
  }, []);

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('[Push] Error checking subscription:', err);
      }
    };

    if (isSupported) {
      checkSubscription();
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications not supported');
    }

    // Check permission first
    const currentPermission = getNotificationPermission();
    if (currentPermission === 'denied') {
      setPermissionDenied(true);
      throw new Error('Notification permission denied. Please enable notifications in browser settings.');
    }

    // Request permission if not granted
    if (currentPermission !== 'granted') {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      if (newPermission !== 'granted') {
        setPermissionDenied(newPermission === 'denied');
        throw new Error('Notification permission not granted');
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get VAPID public key from backend
      const vapidResult = await getVapidPublicKey();
      if (!vapidResult.data?.publicKey) {
        throw new Error('Failed to get VAPID key');
      }
      const vapidPublicKey = vapidResult.data.publicKey;

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Push] Service Worker registered:', registration.scope);

      // Subscribe to push notifications
      // Convert Uint8Array to ArrayBufferView for compatibility
      const vapidKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey.buffer as ArrayBuffer,
      });

      // Send subscription to backend
      const subscribeResult = await subscribeToPush({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      }, navigator.userAgent);

      if (!subscribeResult.success) {
        throw new Error(subscribeResult.message || 'Failed to save subscription');
      }

      setIsSubscribed(true);
      console.log('[Push] Successfully subscribed to push notifications');
    } catch (err: any) {
      console.error('[Push] Error subscribing:', err);
      setError(err.message || 'Failed to subscribe');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications not supported');
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Notify backend
      await unsubscribeFromPush(subscription?.endpoint);

      setIsSubscribed(false);
      console.log('[Push] Successfully unsubscribed from push notifications');
    } catch (err: any) {
      console.error('[Push] Error unsubcribing:', err);
      setError(err.message || 'Failed to unsubscribe');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Request permission helper
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    setPermissionDenied(newPermission === 'denied');
    return newPermission;
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    permission,
    permissionDenied,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

/**
 * Convert base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert Uint8Array to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}