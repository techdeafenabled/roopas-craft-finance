"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPin, completeSetup } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { generateId, today } from "@/lib/format";
import PinKeypad from "@/components/PinKeypad";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import type { Bank } from "@/lib/types";

type Step = "create-pin" | "confirm-pin" | "add-banks";

interface BankEntry {
  name: string;
  type: "bank" | "cash";
  opening_balance: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("create-pin");
  const [pinFirst, setPinFirst] = useState("");
  const [shake, setShake] = useState(false);
  const [banks, setBanks] = useState<BankEntry[]>([
    { name: "Cash", type: "cash", opening_balance: "" },
  ]);
  const [saving, setSaving] = useState(false);

  function handleCreatePin(pin: string) {
    setPinFirst(pin);
    setStep("confirm-pin");
  }

  async function handleConfirmPin(pin: string) {
    if (pin !== pinFirst) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error("PINs do not match. Try again.");
      setStep("create-pin");
      setPinFirst("");
      return;
    }
    await createPin(pin);
    setStep("add-banks");
  }

  function addBank() {
    setBanks((b) => [...b, { name: "", type: "bank", opening_balance: "" }]);
  }

  function removeBank(i: number) {
    setBanks((b) => b.filter((_, idx) => idx !== i));
  }

  function updateBank(i: number, field: keyof BankEntry, value: string) {
    setBanks((b) =>
      b.map((bk, idx) => (idx === i ? { ...bk, [field]: value } : bk))
    );
  }

  async function handleFinish() {
    const validBanks = banks.filter((b) => b.name.trim());
    if (validBanks.length === 0) {
      toast.error("Add at least one bank or cash account.");
      return;
    }
    setSaving(true);
    try {
      const bankRows: Bank[] = validBanks.map((b) => ({
        id: generateId(),
        name: b.name.trim(),
        type: b.type,
        opening_balance: parseFloat(b.opening_balance || "0"),
        created_at: new Date().toISOString(),
      }));
      await db.banks.bulkPut(bankRows as Bank[]);
      await supabase.from("banks").insert(bankRows);
      await completeSetup();
      router.replace("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] px-6 py-12">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-8">
        {/* Header */}
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">
            First Time Setup
          </p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {step === "create-pin" && "Create your PIN"}
            {step === "confirm-pin" && "Confirm your PIN"}
            {step === "add-banks" && "Add your accounts"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {step === "create-pin" && "Choose a 4-digit PIN to secure your app."}
            {step === "confirm-pin" && "Enter the same PIN again to confirm."}
            {step === "add-banks" && "Add your bank accounts and cash. Enter current balances."}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          {(["create-pin", "confirm-pin", "add-banks"] as Step[]).map((s, i) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full"
              style={{
                background:
                  step === s ||
                  (step === "confirm-pin" && i === 0) ||
                  (step === "add-banks" && i < 2)
                    ? "var(--forest-green)"
                    : "var(--border)",
              }}
            />
          ))}
        </div>

        {/* PIN steps */}
        {(step === "create-pin" || step === "confirm-pin") && (
          <PinKeypad
            onComplete={
              step === "create-pin" ? handleCreatePin : handleConfirmPin
            }
            shake={shake}
          />
        )}

        {/* Bank step */}
        {step === "add-banks" && (
          <div className="flex flex-col gap-4">
            {banks.map((bank, i) => (
              <div key={i} className="card flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="Account name (e.g. SBI, Cash)"
                    value={bank.name}
                    onChange={(e) => updateBank(i, "name", e.target.value)}
                    className="text-sm font-semibold bg-transparent outline-none flex-1 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                  />
                  {banks.length > 1 && (
                    <button onClick={() => removeBank(i)} className="text-[var(--danger)]">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => updateBank(i, "type", "bank")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      bank.type === "bank"
                        ? "bg-[var(--forest-green)] text-white border-[var(--forest-green)]"
                        : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                    }`}
                  >
                    Bank
                  </button>
                  <button
                    onClick={() => updateBank(i, "type", "cash")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      bank.type === "cash"
                        ? "bg-[var(--forest-green)] text-white border-[var(--forest-green)]"
                        : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                    }`}
                  >
                    Cash
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-secondary)]">₹</span>
                  <input
                    type="number"
                    placeholder="Opening balance (0)"
                    value={bank.opening_balance}
                    onChange={(e) => updateBank(i, "opening_balance", e.target.value)}
                    className="text-sm bg-transparent outline-none flex-1 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                    inputMode="decimal"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addBank}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--forest-green)]"
            >
              <Plus size={16} /> Add another account
            </button>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="mt-4 h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "var(--forest-green)" }}
            >
              {saving ? "Saving..." : "Get Started"}
              {!saving && <ChevronRight size={18} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
