"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, generateId } from "@/lib/format";
import toast from "react-hot-toast";
import { Landmark, Plus, Trash2, Eye, EyeOff, Banknote, Wallet, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Bank } from "@/lib/types";

const HIDE_KEY = "rcj_hide_amounts";

const BANK_GRADIENTS = [
  "linear-gradient(135deg, #0D530E, #306D29)",
  "linear-gradient(135deg, #8B7D3A, #B5A84E)",
  "linear-gradient(135deg, #1B5E5B, #2D8A86)",
  "linear-gradient(135deg, #5B3D1E, #8A6A3D)",
  "linear-gradient(135deg, #0D530E, #3D8A35)",
];

export default function BanksPage() {
  const [banks, setBanks] = useState<(Bank & { balance: number })[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"bank" | "cash">("bank");
  const [newBalance, setNewBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(HIDE_KEY) === "1");
  }, []);

  function toggleHide() {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem(HIDE_KEY, next ? "1" : "0");
  }

  async function load() {
    const [allBanks, allTx, allTxBanks, allInvestEntries] = await Promise.all([
      db.banks.toArray(),
      db.transactions.toArray(),
      db.transaction_banks.toArray(),
      db.investment_entries.toArray(),
    ]);
    const withBalance = allBanks.map((bank) => {
      const relevant = allTxBanks.filter((tb) => tb.bank_id === bank.id);
      let balance = relevant.reduce((sum, tb) => {
        const tx = allTx.find((t) => t.id === tb.transaction_id);
        if (!tx) return sum;
        return sum + (tx.type === "sale" ? tb.amount : -tb.amount);
      }, bank.opening_balance);
      const investAdjust = allInvestEntries
        .filter((ie) => ie.bank_id === bank.id)
        .reduce((sum, ie) => sum + (ie.type === "withdraw" ? ie.amount : -ie.amount), 0);
      balance += investAdjust;
      return { ...bank, balance };
    });
    setBanks(withBalance);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newName.trim()) { toast.error("Enter account name."); return; }
    setSaving(true);
    try {
      const bank: Bank = {
        id: generateId(),
        name: newName.trim(),
        type: newType,
        opening_balance: parseFloat(newBalance || "0"),
        created_at: new Date().toISOString(),
      };
      await db.banks.put(bank as Bank);
      if (navigator.onLine) await supabase.from("banks").insert(bank);
      toast.success("Account added.");
      setShowAdd(false);
      setNewName("");
      setNewBalance("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const txCount = await db.transaction_banks.where("bank_id").equals(id).count();
    if (txCount > 0) {
      toast.error("Cannot delete — this account has transactions.");
      return;
    }
    await db.banks.delete(id);
    if (navigator.onLine) await supabase.from("banks").delete().eq("id", id);
    toast.success("Account removed.");
    load();
  }

  const totalBalance = banks.reduce((s, b) => s + b.balance, 0);

  return (
    <div className="px-4 pt-6 pb-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--forest-green)" }}>
            <Landmark size={20} color="white" />
          </div>
          <h1 className="text-xl font-bold">Banks & Accounts</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleHide}
            className="w-9 h-9 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center"
          >
            {hidden
              ? <EyeOff size={16} className="text-[var(--text-secondary)]" />
              : <Eye size={16} className="text-[var(--text-secondary)]" />
            }
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border)] bg-white"
          >
            <Plus size={18} style={{ color: "var(--forest-green)" }} />
          </button>
        </div>
      </div>

      {/* Total balance summary */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D530E, #306D29 60%, #3D8A35)" }}
      >
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -right-2 w-20 h-20 rounded-full bg-white/5" />
        <p className="text-[10px] uppercase tracking-widest opacity-70 font-semibold">Total Balance</p>
        <p className="text-3xl font-bold mt-1">
          {hidden ? "••••••" : formatINR(totalBalance)}
        </p>
        <p className="text-xs opacity-60 mt-1">{banks.length} account{banks.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-bold">New Account</p>
          <input
            type="text"
            placeholder="Account name (e.g. SBI, HDFC, Cash)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-[var(--off-white)] rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <div className="flex gap-2">
            {(["bank", "cash"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize transition-colors ${
                  newType === t ? "text-white border-transparent" : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                }`}
                style={newType === t ? { background: "var(--forest-green)" } : {}}
              >
                {t === "bank" ? "🏦 Bank" : "💵 Cash"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-[var(--off-white)] rounded-xl px-3 py-2.5">
            <span className="text-sm font-bold text-[var(--text-secondary)]">₹</span>
            <input
              type="number"
              placeholder="Opening balance (0)"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              inputMode="decimal"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--forest-green)" }}
          >
            {saving ? "Adding..." : "Add Account"}
          </button>
        </div>
      )}

      {/* Bank cards */}
      <div className="flex flex-col gap-3">
        {banks.map((bank, i) => (
          <div
            key={bank.id}
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{ background: BANK_GRADIENTS[i % BANK_GRADIENTS.length] }}
          >
            {/* decorative circles */}
            <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 right-10 w-16 h-16 rounded-full bg-white/5" />

            <div className="relative flex items-start justify-between">
              {/* Icon + type */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  {bank.type === "cash"
                    ? <Wallet size={18} color="white" />
                    : <Banknote size={18} color="white" />
                  }
                </div>
                <div>
                  <p className="text-xs opacity-70 capitalize font-medium">{bank.type} account</p>
                  <p className="text-base font-bold leading-tight">{bank.name}</p>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(bank.id)}
                className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center active:bg-white/30"
              >
                <Trash2 size={14} color="white" />
              </button>
            </div>

            {/* Balance */}
            <div className="relative mt-5">
              <p className="text-[10px] uppercase tracking-widest opacity-60 font-semibold">
                Current Balance
              </p>
              <p className={`text-2xl font-bold mt-0.5 ${bank.balance < 0 ? "text-red-300" : "text-white"}`}>
                {hidden ? "•••••••" : formatINR(bank.balance)}
              </p>
              <p className="text-[10px] opacity-50 mt-1">
                Opening: {hidden ? "•••••" : formatINR(bank.opening_balance)}
              </p>
            </div>

            {/* Bottom row */}
            <div className="relative mt-4 pt-3 border-t border-white/15 flex justify-between items-center">
              <div>
                <p className="text-[10px] opacity-60">Net movement</p>
                <p className={`text-sm font-bold ${(bank.balance - bank.opening_balance) >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {hidden ? "•••••" : (bank.balance - bank.opening_balance >= 0 ? "+" : "") + formatINR(bank.balance - bank.opening_balance)}
                </p>
              </div>
              <Link
                href={`/banks/${bank.id}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 text-xs font-semibold"
              >
                Passbook <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {banks.length === 0 && (
        <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
          No accounts yet. Tap + to add one.
        </div>
      )}
    </div>
  );
}
