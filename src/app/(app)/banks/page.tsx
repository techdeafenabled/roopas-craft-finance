"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, generateId } from "@/lib/format";
import toast from "react-hot-toast";
import { Landmark, Plus, Trash2 } from "lucide-react";
import type { Bank } from "@/lib/types";

export default function BanksPage() {
  const [banks, setBanks] = useState<(Bank & { balance: number })[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"bank" | "cash">("bank");
  const [newBalance, setNewBalance] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [allBanks, allTx, allTxBanks] = await Promise.all([
      db.banks.toArray(),
      db.transactions.toArray(),
      db.transaction_banks.toArray(),
    ]);
    const withBalance = allBanks.map((bank) => {
      const relevant = allTxBanks.filter((tb) => tb.bank_id === bank.id);
      const balance = relevant.reduce((sum, tb) => {
        const tx = allTx.find((t) => t.id === tb.transaction_id);
        if (!tx) return sum;
        return sum + (tx.type === "sale" ? tb.amount : -tb.amount);
      }, bank.opening_balance);
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

  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--forest-green)" }}>
            <Landmark size={20} color="white" />
          </div>
          <h1 className="text-xl font-bold">Banks & Accounts</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border)] bg-white">
          <Plus size={18} style={{ color: "var(--forest-green)" }} />
        </button>
      </div>

      {showAdd && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-bold">New Account</p>
          <input
            type="text"
            placeholder="Account name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            {(["bank", "cash"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize ${
                  newType === t ? "text-white border-transparent" : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                }`}
                style={newType === t ? { background: "var(--forest-green)" } : {}}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">₹</span>
            <input
              type="number"
              placeholder="Opening balance"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              inputMode="decimal"
              className="flex-1 bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--forest-green)" }}
          >
            {saving ? "Adding..." : "Add Account"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {banks.map((bank) => (
          <div key={bank.id} className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--off-white)]">
              <Landmark size={18} style={{ color: "var(--forest-green)" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{bank.name}</p>
              <p className="text-xs text-[var(--text-secondary)] capitalize">{bank.type}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${bank.balance >= 0 ? "text-sale" : "text-expense"}`}>
                {formatINR(bank.balance)}
              </p>
            </div>
            <button onClick={() => handleDelete(bank.id)} className="text-[var(--text-secondary)] p-1">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
