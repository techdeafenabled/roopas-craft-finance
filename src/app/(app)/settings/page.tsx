"use client";
import { useState } from "react";
import { changePin } from "@/lib/auth";
import PinKeypad from "@/components/PinKeypad";
import toast from "react-hot-toast";
import { Settings, KeyRound, Check } from "lucide-react";

type PinStep = "idle" | "current" | "new" | "confirm";

export default function SettingsPage() {
  const [pinStep, setPinStep] = useState<PinStep>("idle");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [shake, setShake] = useState(false);

  async function handleCurrentPin(pin: string) {
    setCurrentPin(pin);
    setPinStep("new");
  }

  function handleNewPin(pin: string) {
    setNewPin(pin);
    setPinStep("confirm");
  }

  async function handleConfirmPin(pin: string) {
    if (pin !== newPin) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error("PINs do not match.");
      setNewPin("");
      setPinStep("new");
      return;
    }
    const result = await changePin(currentPin, pin);
    if (result.success) {
      toast.success("PIN changed successfully!");
      setPinStep("idle");
      setCurrentPin("");
      setNewPin("");
    } else {
      toast.error(result.error || "Failed to change PIN.");
      setPinStep("idle");
    }
  }

  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--forest-green)" }}>
          <Settings size={18} color="white" />
        </div>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {pinStep === "idle" ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setPinStep("current")}
            className="card flex items-center gap-3 py-3.5 w-full text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--off-white)] flex items-center justify-center">
              <KeyRound size={18} style={{ color: "var(--forest-green)" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Change PIN</p>
              <p className="text-xs text-[var(--text-secondary)]">Update your 4-digit security PIN</p>
            </div>
            <Check size={16} className="text-[var(--text-secondary)]" />
          </button>

          <div className="card">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Security</p>
            <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Auto-lock after</span>
                <span className="font-semibold text-[var(--text-primary)]">5 minutes</span>
              </div>
              <div className="flex justify-between">
                <span>Lock on tab switch</span>
                <span className="font-semibold text-sale">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span>Max PIN attempts</span>
                <span className="font-semibold text-[var(--text-primary)]">5</span>
              </div>
              <div className="flex justify-between">
                <span>Lockout duration</span>
                <span className="font-semibold text-[var(--text-primary)]">30 minutes</span>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">App Info</p>
            <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>App</span>
                <span className="font-semibold text-[var(--text-primary)]">Roopa&apos;s Craft Finance</span>
              </div>
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-semibold text-[var(--text-primary)]">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Data storage</span>
                <span className="font-semibold text-[var(--text-primary)]">Local + Supabase</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {pinStep === "current" && "Enter current PIN"}
              {pinStep === "new" && "Enter new PIN"}
              {pinStep === "confirm" && "Confirm new PIN"}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {pinStep === "current" && "Verify your identity first."}
              {pinStep === "new" && "Choose a new 4-digit PIN."}
              {pinStep === "confirm" && "Enter the same PIN again."}
            </p>
          </div>
          <PinKeypad
            onComplete={
              pinStep === "current"
                ? handleCurrentPin
                : pinStep === "new"
                ? handleNewPin
                : handleConfirmPin
            }
            shake={shake}
          />
          <button
            onClick={() => { setPinStep("idle"); setCurrentPin(""); setNewPin(""); }}
            className="text-sm text-[var(--text-secondary)] text-center"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
