"use client";
import { useState, useEffect, useCallback } from "react";
import { Delete } from "lucide-react";

interface PinKeypadProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  shake?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function PinKeypad({
  length = 4,
  onComplete,
  disabled = false,
  shake = false,
}: PinKeypadProps) {
  const [pin, setPin] = useState("");

  const handleKey = useCallback(
    (key: string) => {
      if (disabled) return;
      if (key === "del") {
        setPin((p) => p.slice(0, -1));
        return;
      }
      if (pin.length >= length) return;
      const next = pin + key;
      setPin(next);
      if (next.length === length) {
        setTimeout(() => {
          onComplete(next);
          setPin("");
        }, 100);
      }
    },
    [pin, length, onComplete, disabled]
  );

  // Physical keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      if (e.key === "Backspace") handleKey("del");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Dots */}
      <div className="flex gap-4">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`pin-dot ${i < pin.length ? "filled" : ""} ${shake ? "animate-bounce" : ""}`}
          />
        ))}
      </div>

      {/* Keys */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((key, i) => {
          if (key === "") return <div key={i} />;
          return (
            <button
              key={i}
              onClick={() => handleKey(key)}
              disabled={disabled}
              className="h-16 rounded-2xl text-xl font-semibold flex items-center justify-center
                bg-white border border-[var(--border)] text-[var(--text-primary)]
                active:bg-[var(--off-white)] active:scale-95 transition-all
                disabled:opacity-40 select-none"
            >
              {key === "del" ? <Delete size={20} /> : key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
