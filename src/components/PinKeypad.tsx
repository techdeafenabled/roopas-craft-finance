"use client";
import { useState, useEffect, useCallback } from "react";
import { Delete } from "lucide-react";

interface PinKeypadProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  shake?: boolean;
  dark?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function PinKeypad({
  length = 4,
  onComplete,
  disabled = false,
  shake = false,
  dark = false,
}: PinKeypadProps) {
  const [pin, setPin] = useState("");
  const [pressedKey, setPressedKey] = useState<string | null>(null);

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
        }, 120);
      }
    },
    [pin, length, onComplete, disabled]
  );

  const handlePress = (key: string) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 150);
    handleKey(key);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      if (e.key === "Backspace") handleKey("del");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  return (
    <div className="flex flex-col items-center gap-10 w-full">

      {/* PIN dots */}
      <div className={`flex gap-5 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className="relative flex items-center justify-center"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: dark ? "2px solid rgba(255,255,255,0.5)" : "2px solid var(--forest-green)",
              background: i < pin.length
                ? dark ? "white" : "var(--forest-green)"
                : "transparent",
              transform: i < pin.length ? "scale(1.15)" : "scale(1)",
              transition: "all 0.15s ease",
              boxShadow: i < pin.length && dark ? "0 0 8px rgba(255,255,255,0.4)" : "none",
            }}
          />
        ))}
      </div>

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        {KEYS.map((key, i) => {
          if (key === "") return <div key={i} />;
          const isPressed = pressedKey === key;

          return (
            <button
              key={i}
              onPointerDown={() => handlePress(key)}
              disabled={disabled}
              className="select-none outline-none focus:outline-none"
              style={{
                height: 70,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: key === "del" ? 14 : 22,
                fontWeight: 500,
                color: dark ? "white" : "var(--text-primary)",
                background: isPressed
                  ? dark ? "rgba(255,255,255,0.35)" : "var(--forest-green)"
                  : dark ? "rgba(255,255,255,0.12)" : "white",
                backdropFilter: dark ? "blur(10px)" : "none",
                WebkitBackdropFilter: dark ? "blur(10px)" : "none",
                border: dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)",
                transform: isPressed ? "scale(0.93)" : "scale(1)",
                transition: "transform 0.1s ease, background 0.1s ease",
                boxShadow: dark
                  ? isPressed ? "none" : "0 2px 10px rgba(0,0,0,0.2)"
                  : isPressed ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {key === "del"
                ? <Delete size={18} color={dark ? "white" : "var(--text-secondary)"} />
                : key
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}
