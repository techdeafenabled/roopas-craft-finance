"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { generateId, today } from "@/lib/format";
import type { Transaction, TransactionBank, Stall } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import type { Bank, TransactionType, ExpenseCategory } from "@/lib/types";
import { Check } from "lucide-react";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "stall", label: "Stall Fee" },
  { value: "stall_rent", label: "Stall Rent" },
  { value: "fuel", label: "Fuel" },
  { value: "food", label: "Food" },
  { value: "travel", label: "Travel" },
  { value: "salary", label: "Salary" },
  { value: "helper_salary", label: "Helper" },
  { value: "other", label: "Other" },
];

interface BankSplit {
  bank_id: string;
  amount: string;
}

interface EntryFormProps {
  type: TransactionType;
  onSuccess?: () => void;
}

export default function EntryForm({ type, onSuccess }: EntryFormProps) {
  const { refreshSyncCount } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("stall");
  const [stallId, setStallId] = useState("");
  const [splits, setSplits] = useState<BankSplit[]>([{ bank_id: "", amount: "" }]);
  const [useSplit, setUseSplit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.banks.toArray().then((b) => {
      setBanks(b);
      if (b.length > 0) setSplits([{ bank_id: b[0].id, amount: "" }]);
    });
    if (type === "sale" || type === "expense") {
      db.stalls.where("status").equals("active").toArray().then(setStalls);
    }
  }, [type]);

  function addSplit() {
    if (splits.length >= 2) return;
    const usedIds = splits.map((s) => s.bank_id);
    const next = banks.find((b) => !usedIds.includes(b.id));
    setSplits((s) => [...s, { bank_id: next?.id ?? "", amount: "" }]);
    setUseSplit(true);
  }

  function removeSplit(i: number) {
    setSplits((s) => s.filter((_, idx) => idx !== i));
    if (splits.length <= 2) setUseSplit(false);
  }

  function updateSplit(i: number, field: keyof BankSplit, value: string) {
    setSplits((s) => s.map((sp, idx) => (idx === i ? { ...sp, [field]: value } : sp)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const totalAmount = parseFloat(amount);
    if (!totalAmount || totalAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    // Validate splits
    const activeSplits = splits.filter((s) => s.bank_id);
    if (activeSplits.length === 0) {
      toast.error("Select a bank account.");
      return;
    }

    if (useSplit && activeSplits.length > 1) {
      const splitTotal = activeSplits.reduce((s, sp) => s + parseFloat(sp.amount || "0"), 0);
      if (Math.abs(splitTotal - totalAmount) > 0.01) {
        toast.error(`Split amounts must add up to ₹${totalAmount}. Currently ₹${splitTotal}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const txId = generateId();
      const txData = {
        id: txId,
        type,
        amount: totalAmount,
        date,
        note: note.trim() || null,
        expense_category: type === "expense" ? category : null,
        stall_id: stallId || null,
        customer_id: null,
        synced: false,
        created_at: new Date().toISOString(),
      };

      const bankRows = useSplit && activeSplits.length > 1
        ? activeSplits.map((sp) => ({
            id: generateId(),
            transaction_id: txId,
            bank_id: sp.bank_id,
            amount: parseFloat(sp.amount),
          }))
        : [{ id: generateId(), transaction_id: txId, bank_id: activeSplits[0].bank_id, amount: totalAmount }];

      await db.transactions.put(txData as Transaction);
      await db.transaction_banks.bulkPut(bankRows as TransactionBank[]);

      // Try sync immediately if online
      if (navigator.onLine) {
        const { error } = await supabase.from("transactions").insert({ ...txData, synced: true });
        if (!error) {
          await supabase.from("transaction_banks").insert(bankRows);
          await db.transactions.update(txId, { synced: true } as Partial<Transaction>);
        }
      }

      refreshSyncCount();
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} saved!`);
      setAmount("");
      setNote("");
      setDate(today());
      setStallId("");
      setSplits([{ bank_id: banks[0]?.id ?? "", amount: "" }]);
      setUseSplit(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const typeColor =
    type === "sale" ? "var(--success)" : type === "purchase" ? "var(--warning)" : "var(--danger)";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Amount */}
      <div className="card flex items-center gap-3">
        <span className="text-2xl font-bold" style={{ color: typeColor }}>₹</span>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-2xl font-bold bg-transparent outline-none flex-1"
          style={{ color: typeColor }}
          required
        />
      </div>

      {/* Expense category */}
      {type === "expense" && (
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                category === cat.value
                  ? "text-white border-transparent"
                  : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
              }`}
              style={category === cat.value ? { background: typeColor } : {}}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Stall selection */}
      {stalls.length > 0 && (type === "sale" || type === "expense") && (
        <div className="card flex flex-col gap-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Link to Stall (optional)
          </p>
          <select
            value={stallId}
            onChange={(e) => setStallId(e.target.value)}
            className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">No stall</option>
            {stalls.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.place}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Bank selection */}
      <div className="card flex flex-col gap-3">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Bank / Account
        </p>
        {splits.map((split, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={split.bank_id}
              onChange={(e) => updateSplit(i, "bank_id", e.target.value)}
              className="flex-1 bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="">Select account</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {useSplit && (
              <input
                type="number"
                inputMode="decimal"
                placeholder="Amount"
                value={split.amount}
                onChange={(e) => updateSplit(i, "amount", e.target.value)}
                className="w-24 bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
              />
            )}
            {splits.length > 1 && (
              <button
                type="button"
                onClick={() => removeSplit(i)}
                className="text-xs text-[var(--danger)] font-semibold"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {splits.length < 2 && banks.length >= 2 && (
          <button
            type="button"
            onClick={addSplit}
            className="text-xs font-semibold text-left"
            style={{ color: typeColor }}
          >
            + Split across 2 banks
          </button>
        )}
      </div>

      {/* Date */}
      <div className="card flex items-center gap-3">
        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-10">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)]"
          max={today()}
        />
      </div>

      {/* Note */}
      <div className="card">
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          maxLength={200}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: typeColor }}
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Check size={18} />
            Save {type.charAt(0).toUpperCase() + type.slice(1)}
          </>
        )}
      </button>
    </form>
  );
}
