"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { syncFromSupabase, syncToSupabase } from "@/lib/sync";

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_KEY = "rcj_authenticated";

interface AuthContextType {
  isAuthenticated: boolean;
  isOnline: boolean;
  login: () => void;
  logout: () => void;
  pendingSyncCount: number;
  refreshSyncCount: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_KEY);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const refreshSyncCount = useCallback(async () => {
    try {
      const { db } = await import("@/lib/db");
      const [txCount, debtorCount, creditorCount, stallCount, investCount] = await Promise.all([
        db.transactions.where("synced").equals(0).count(),
        db.debtor_entries.where("synced").equals(0).count(),
        db.creditor_entries.where("synced").equals(0).count(),
        db.stalls.where("synced").equals(0).count(),
        db.investment_entries.where("synced").equals(0).count(),
      ]);
      setPendingSyncCount(txCount + debtorCount + creditorCount + stallCount + investCount);
    } catch {
      // ignore
    }
  }, []);

  // Restore session on mount (sessionStorage clears on tab close)
  useEffect(() => {
    const wasAuth = sessionStorage.getItem(SESSION_KEY) === "1";
    if (wasAuth) {
      setIsAuthenticated(true);
      resetInactivityTimer();
    }
  }, [resetInactivityTimer]);

  // Lock on tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) logout();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [logout]);

  // Reset inactivity timer on user activity
  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetInactivityTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [isAuthenticated, resetInactivityTimer]);

  // Online/offline detection + sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncToSupabase();
      await syncFromSupabase();
      refreshSyncCount();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    if (navigator.onLine) refreshSyncCount();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshSyncCount]);

  // Auto daily backup
  useEffect(() => {
    if (!isAuthenticated || !navigator.onLine) return;
    import("@/lib/backup").then(async ({ shouldAutoBackup, saveBackupToCloud }) => {
      if (shouldAutoBackup()) {
        await saveBackupToCloud("auto");
      }
    });
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isOnline, login, logout, pendingSyncCount, refreshSyncCount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
