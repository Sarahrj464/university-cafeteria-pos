import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getActiveShift, openShift as apiOpenShift, closeShift as apiCloseShift } from '../services/shifts';

export const ShiftContext = createContext(null);

export function ShiftProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Defensive: ensure the provider never crashes due to malformed API responses.
  // If /shifts/active returns unexpected shape, consumers may temporarily receive
  // undefined values during refresh/state transitions.
  const sanitizeShift = useCallback((shift) => {
    if (shift === null || shift === undefined) return null;
    if (typeof shift !== 'object') return null;
    return shift;
  }, []);


  // Prevent excessive polling / rapid re-fetches (429 spam).
  // This also helps when providers re-mount during auth/state transitions.
  const lastCheckAtRef = useRef(0);
  const checkCountRef = useRef(0);

  const checkShift = useCallback(async () => {
    const now = Date.now();
    const throttleMs = 60_000; // at most once per minute

    // Basic throttle to guarantee we never hammer /shifts/active.
    if (now - lastCheckAtRef.current < throttleMs) {
      return;
    }
    lastCheckAtRef.current = now;

    checkCountRef.current += 1;
    console.log(`[POS] getActiveShift() call #${checkCountRef.current}`);

    if (!isAuthenticated || !['cashier', 'admin'].includes(user?.role)) {
      setActiveShift(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const shift = await getActiveShift();
      setActiveShift(sanitizeShift(shift));

    } catch (err) {
      console.error('Failed to fetch active shift:', err);
      setActiveShift(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    // Auth transitions can remount providers; also the internal throttle can
    // incorrectly block the first post-login check. Reset throttle whenever
    // auth/user identity becomes available.
    lastCheckAtRef.current = 0;

    // Only run when authenticated and for roles that can own shifts.
    if (isAuthenticated && ['cashier', 'admin'].includes(user?.role)) {
      checkShift();
    } else {
      setActiveShift(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role, checkShift]);


  const openShift = useCallback(async (openingCash) => {
    setIsLoading(true);
    try {
      const newShift = await apiOpenShift(openingCash);
      setActiveShift(newShift);
      return newShift;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeShift = useCallback(async (shiftId, closingCash) => {
    setIsLoading(true);
    try {
      const closedShift = await apiCloseShift(shiftId, closingCash);
      setActiveShift(null);
      return closedShift;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    activeShift,
    isLoading,
    openShift,
    closeShift,
    refreshActiveShift: checkShift,
  }), [activeShift, isLoading, openShift, closeShift, checkShift]);

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
