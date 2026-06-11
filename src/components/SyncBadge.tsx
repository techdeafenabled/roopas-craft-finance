"use client";
import { useAuth } from "@/context/AuthContext";
import { WifiOff, RefreshCw } from "lucide-react";

export default function SyncBadge() {
  const { isOnline, pendingSyncCount } = useAuth();

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
        isOnline
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {isOnline ? (
        <>
          <RefreshCw size={11} className="animate-spin" />
          {pendingSyncCount} pending
        </>
      ) : (
        <>
          <WifiOff size={11} />
          Offline
        </>
      )}
    </div>
  );
}
