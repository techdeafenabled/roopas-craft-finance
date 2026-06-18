"use client";
import { useState, useEffect, useRef } from "react";
import { changePin } from "@/lib/auth";
import {
  createBackup,
  saveBackupToCloud,
  downloadBackupAsJson,
  restoreFromBackup,
  getLastBackupTime,
  type BackupData,
} from "@/lib/backup";
import PinKeypad from "@/components/PinKeypad";
import toast from "react-hot-toast";
import {
  Settings,
  KeyRound,
  Check,
  CloudUpload,
  Download,
  Upload,
  Shield,
  Clock,
} from "lucide-react";

type PinStep = "idle" | "current" | "new" | "confirm";

export default function SettingsPage() {
  const [pinStep, setPinStep] = useState<PinStep>("idle");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [shake, setShake] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLastBackup(getLastBackupTime());
  }, []);

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

  async function handleCloudBackup() {
    setBackingUp(true);
    const success = await saveBackupToCloud("manual");
    setBackingUp(false);
    if (success) {
      toast.success("Backup saved to cloud!");
      setLastBackup(new Date().toISOString());
    } else {
      toast.error("Backup failed. Try again.");
    }
  }

  async function handleDownload() {
    try {
      const backup = await createBackup();
      downloadBackupAsJson(backup);
      toast.success("Backup downloaded!");
    } catch {
      toast.error("Download failed.");
    }
  }

  function handleRestoreClick() {
    fileInputRef.current?.click();
  }

  async function handleFileRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    try {
      const text = await file.text();
      const backup: BackupData = JSON.parse(text);
      const success = await restoreFromBackup(backup);
      if (success) {
        toast.success("Data restored! Refresh the app.");
      } else {
        toast.error("Invalid backup file.");
      }
    } catch {
      toast.error("Could not read backup file.");
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const lastBackupText = lastBackup
    ? `Last backup: ${new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(lastBackup))}`
    : "No backup yet";

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
          {/* Change PIN */}
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

          {/* Backup & Restore */}
          <div className="card flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: "var(--forest-green)" }} />
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Backup & Restore
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Clock size={12} />
              <span>{lastBackupText}</span>
            </div>

            {/* Backup to cloud */}
            <button
              onClick={handleCloudBackup}
              disabled={backingUp}
              className="flex items-center gap-3 py-3 px-3 rounded-xl bg-[var(--off-white)] active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <CloudUpload size={18} style={{ color: "var(--forest-green)" }} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Backup Now</p>
                <p className="text-xs text-[var(--text-secondary)]">Save all data to cloud</p>
              </div>
              {backingUp && (
                <div className="w-4 h-4 border-2 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
              )}
            </button>

            {/* Download JSON */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-3 py-3 px-3 rounded-xl bg-[var(--off-white)] active:scale-[0.98] transition-transform"
            >
              <Download size={18} style={{ color: "var(--forest-green)" }} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Download Backup</p>
                <p className="text-xs text-[var(--text-secondary)]">Save as JSON file to your device</p>
              </div>
            </button>

            {/* Restore from file */}
            <button
              onClick={handleRestoreClick}
              disabled={restoring}
              className="flex items-center gap-3 py-3 px-3 rounded-xl bg-[var(--off-white)] active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <Upload size={18} className="text-[var(--warning)]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Restore from File</p>
                <p className="text-xs text-[var(--text-secondary)]">Import a JSON backup file</p>
              </div>
              {restoring && (
                <div className="w-4 h-4 border-2 border-[var(--warning)] border-t-transparent rounded-full animate-spin" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
          </div>

          {/* Security info */}
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
              <div className="flex justify-between">
                <span>Auto daily backup</span>
                <span className="font-semibold text-sale">Enabled</span>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="card">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">App Info</p>
            <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>App</span>
                <span className="font-semibold text-[var(--text-primary)]">Roopa&apos;s Craft Finance</span>
              </div>
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-semibold text-[var(--text-primary)]">2.0.0</span>
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
