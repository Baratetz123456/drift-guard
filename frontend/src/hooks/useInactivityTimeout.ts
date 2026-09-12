import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

interface UseInactivityTimeoutOptions {
  timeoutMs?: number; // Total idle timeout (default 30 mins)
  warningMs?: number; // Warning modal window (default 60 secs)
}

export function useInactivityTimeout(options: UseInactivityTimeoutOptions = {}) {
  const {
    timeoutMs = 30 * 60 * 1000, // 30 minutes
    warningMs = 60 * 1000,       // 60 seconds
  } = options;

  const { isAuthenticated, logout, extendSession: storeExtendSession, addToast } = useAppStore();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(warningMs / 1000));

  const lastActivityRef = useRef<number>(Date.now());
  const isWarningOpenRef = useRef<boolean>(false);

  // Keep ref synchronized with state to avoid race conditions in event listeners
  useEffect(() => {
    isWarningOpenRef.current = isWarningOpen;
  }, [isWarningOpen]);

  // Reset activity timestamp on interaction
  const recordActivity = useCallback(() => {
    // If warning modal is already displayed, operator must explicitly click "Keep Session Active"
    if (isWarningOpenRef.current) {
      return;
    }
    lastActivityRef.current = Date.now();
  }, []);

  const handleExtend = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarningOpen(false);
    isWarningOpenRef.current = false;
    storeExtendSession();
  }, [storeExtendSession]);

  const handleSignOut = useCallback(() => {
    setIsWarningOpen(false);
    isWarningOpenRef.current = false;
    logout();
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsWarningOpen(false);
      return;
    }

    lastActivityRef.current = Date.now();

    // Throttled activity event listener
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleUserActivity = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
      }, 1000);
      recordActivity();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Main ticker checking every second
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const timeLeft = timeoutMs - elapsed;

      if (timeLeft <= 0) {
        // Expiration reached
        setIsWarningOpen(false);
        isWarningOpenRef.current = false;
        logout();
        addToast('warning', 'Session expired due to inactivity. Please sign in again.');
      } else if (timeLeft <= warningMs) {
        // Within the warning threshold
        setIsWarningOpen(true);
        isWarningOpenRef.current = true;
        setRemainingSeconds(Math.max(1, Math.ceil(timeLeft / 1000)));
      } else {
        if (isWarningOpenRef.current) {
          setIsWarningOpen(false);
          isWarningOpenRef.current = false;
        }
      }
    }, 1000);

    // Global listener for API auth expiration events
    const handleAuthExpired = () => {
      logout();
      addToast('warning', 'Session expired. Please sign in again.');
    };
    window.addEventListener('auth:expired', handleAuthExpired);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('auth:expired', handleAuthExpired);
      clearInterval(interval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [isAuthenticated, logout, recordActivity, timeoutMs, warningMs, addToast]);

  return {
    isWarningOpen,
    remainingSeconds,
    extendSession: handleExtend,
    signOut: handleSignOut,
  };
}
