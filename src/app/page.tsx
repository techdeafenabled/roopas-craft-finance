"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isSetupComplete, verifyPin, getLockoutStatus } from "@/lib/auth";
import PinKeypad from "@/components/PinKeypad";
import { Shield } from "lucide-react";

export default function LockScreen() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
      return;
    }
    isSetupComplete().then((done) => {
      if (!done) router.replace("/setup");
      else setLoading(false);
    });

    const { locked, remainingMs } = getLockoutStatus();
    if (locked) {
      setLocked(true);
      setLockRemaining(Math.ceil(remainingMs / 60000));
    }
  }, [isAuthenticated, router]);

  // Countdown lockout timer
  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      const { locked: stillLocked, remainingMs } = getLockoutStatus();
      if (!stillLocked) {
        setLocked(false);
        setError("");
      } else {
        setLockRemaining(Math.ceil(remainingMs / 60000));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [locked]);

  async function handlePin(pin: string) {
    setError("");
    const result = await verifyPin(pin);
    if (result.success) {
      login();
      router.replace("/dashboard");
    } else if (result.locked) {
      setLocked(true);
      const { remainingMs } = getLockoutStatus();
      setLockRemaining(Math.ceil(remainingMs / 60000));
      setError("Too many wrong attempts. Account locked.");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      const left = result.attemptsLeft ?? 0;
      setError(`Wrong PIN. ${left} attempt${left === 1 ? "" : "s"} left.`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="w-8 h-8 border-3 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-page)] px-6 py-12">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Logo area */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--forest-green)" }}
          >
            <Shield size={32} color="white" />
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">
              Roopa&apos;s Craft
            </p>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Finance
            </h1>
          </div>
        </div>

        {locked ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-[var(--danger)] font-semibold">Account Locked</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Too many wrong PIN attempts.
              <br />
              Try again in ~{lockRemaining} minute{lockRemaining === 1 ? "" : "s"}.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)]">Enter your PIN</p>
            <PinKeypad onComplete={handlePin} shake={shake} />
            {error && (
              <p className="text-sm text-[var(--danger)] text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
