import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  shouldPreventDefault?: boolean;
  delay?: number;
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

/**
 * Custom hook for long press gesture
 * Inspired by iOS/iPadOS long press behavior
 * 
 * @param callback - Function to call on long press
 * @param options - Configuration options
 * @returns Object with event handlers
 */
export const useLongPress = (
  callback: () => void,
  {
    shouldPreventDefault = true,
    delay = 500,
    onStart,
    onFinish,
    onCancel
  }: UseLongPressOptions = {}
) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTriggeredRef = useRef(false);

  const start = useCallback(() => {
    setIsLongPressing(true);
    isTriggeredRef.current = false;
    onStart?.();
    
    timerRef.current = setTimeout(() => {
      isTriggeredRef.current = true;
      callback();
      onFinish?.();
    }, delay);
  }, [callback, delay, onStart, onFinish]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isTriggeredRef.current) {
      // Was a successful long press
      setIsLongPressing(false);
      isTriggeredRef.current = false;
    } else {
      // Was cancelled before long press completed
      onCancel?.();
      setIsLongPressing(false);
    }
  }, [onCancel]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLongPressing(false);
    isTriggeredRef.current = false;
  }, []);

  // Mouse events for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (shouldPreventDefault) {
      e.preventDefault();
    }
    start();
  }, [shouldPreventDefault, start]);

  const handleMouseUp = useCallback(() => {
    stop();
  }, [stop]);

  const handleMouseLeave = useCallback(() => {
    stop();
  }, [stop]);

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (shouldPreventDefault) {
      e.preventDefault();
    }
    start();
  }, [shouldPreventDefault, start]);

  const handleTouchEnd = useCallback(() => {
    stop();
  }, [stop]);

  const handleTouchCancel = useCallback(() => {
    stop();
  }, [stop]);

  // Keyboard events for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      start();
    }
  }, [start]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      stop();
    }
  }, [stop]);

  return {
    isLongPressing,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
    },
    clear,
  };
};

export default useLongPress;