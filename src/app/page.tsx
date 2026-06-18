"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isSetupComplete, verifyPin, getLockoutStatus } from "@/lib/auth";
import PinKeypad from "@/components/PinKeypad";
import Image from "next/image";
import { Lock } from "lucide-react";

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="flex flex-col items-center select-none">
      <p className="text-6xl font-thin text-white tracking-tight leading-none"
        style={{ fontVariantNumeric: "tabular-nums" }}>
        {time}
      </p>
      <p className="text-sm text-white/60 mt-2 font-medium">{date}</p>
    </div>
  );
}

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

  const handlePin = useCallback(async (pin: string) => {
    setError("");
    const result = await verifyPin(pin);
    if (result.success) {
      login();
      router.replace("/dashboard");
    } else if (result.locked) {
      setLocked(true);
      const { remainingMs } = getLockoutStatus();
      setLockRemaining(Math.ceil(remainingMs / 60000));
      setError("Too many wrong attempts.");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      const left = result.attemptsLeft ?? 0;
      setError(`Wrong PIN · ${left} attempt${left === 1 ? "" : "s"} left`);
    }
  }, [login, router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-8"
        style={{ background: "linear-gradient(160deg, #4A6B50 0%, #5A7D60 35%, #6B8F71 70%, #89A88E 100%)" }}
      >
        {/* Decorative circles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-black/20" />
        </div>

        {/* 3D spinning logo */}
        <div className="relative flex flex-col items-center gap-6">
          <div
            className="relative"
            style={{
              width: 120,
              height: 120,
              animation: "logo-spin-3d 2.4s ease-in-out infinite",
            }}
          >
            {/* Glow ring behind logo */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(200,160,89,0.35) 0%, transparent 70%)",
                transform: "scale(1.4)",
              }}
            />
            {/* Logo card */}
            <div
              className="w-full h-full rounded-3xl overflow-hidden relative"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                className="object-contain p-4"
                sizes="120px"
                priority
              />
              {/* Shine sweep */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)",
                  animation: "logo-shine 2.4s ease-in-out infinite",
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "60%",
                }}
              />
            </div>
          </div>

          {/* Brand text with float */}
          <div
            className="flex flex-col items-center gap-1"
            style={{ animation: "logo-float 3s ease-in-out infinite" }}
          >
            <p className="text-white/50 text-[11px] uppercase tracking-[0.25em] font-semibold">
              Roopa&apos;s Craft Jewellery
            </p>
            <p className="text-white text-2xl font-bold tracking-wide">Finance</p>
          </div>

          {/* Loading dots */}
          <div className="flex gap-2 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/50"
                style={{
                  animation: `logo-float 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        background: "linear-gradient(160deg, #4A6B50 0%, #5A7D60 35%, #6B8F71 70%, #89A88E 100%)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Decorative background circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -left-24 w-64 h-64 rounded-full bg-white/[0.03]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-black/20" />
        <div className="absolute bottom-1/4 -left-12 w-40 h-40 rounded-full bg-white/[0.04]" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8"
        style={{ minHeight: "100svh", justifyContent: "space-between", paddingTop: 48, paddingBottom: 48 }}>

        {/* Top: Logo + brand pill */}
        <div className="flex flex-col items-center gap-6">
          {/* Brand pill */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.18)" }}>
            <div className="w-6 h-6 relative rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
              <Image src="/logo.png" alt="logo" fill className="object-cover" sizes="24px"
                onError={() => {}} />
            </div>
            <span className="text-white/90 text-xs font-semibold tracking-wider uppercase">
              Roopa&apos;s Craft Jewellery
            </span>
          </div>

          {/* Live clock */}
          <LiveClock />
        </div>

        {/* Middle: PIN entry or lockout */}
        <div className="flex flex-col items-center gap-8 w-full">
          {locked ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(220,38,38,0.2)", border: "2px solid rgba(220,38,38,0.5)" }}>
                <Lock size={28} color="#fca5a5" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">Account Locked</p>
                <p className="text-white/50 text-sm mt-1 leading-relaxed">
                  Too many wrong attempts.<br />
                  Try again in ~{lockRemaining} min{lockRemaining === 1 ? "" : "s"}.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 w-full">
              <div className="flex flex-col items-center gap-1">
                <p className="text-white/70 text-sm font-medium tracking-wide">Enter PIN</p>
                {error && (
                  <p className="text-red-300 text-xs font-medium">{error}</p>
                )}
              </div>
              <PinKeypad
                onComplete={handlePin}
                shake={shake}
                dark={true}
                disabled={locked}
              />
            </div>
          )}
        </div>

        {/* Bottom: App branding */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-white/25 text-[10px] uppercase tracking-widest font-medium">
            Finance Tracker
          </p>
          <p className="text-white/15 text-[10px]">Secured with PIN</p>
        </div>
      </div>
    </div>
  );
}
