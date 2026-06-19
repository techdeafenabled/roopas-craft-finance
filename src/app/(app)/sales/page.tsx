"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, formatDate, generateId, today } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Bank, Transaction, TransactionBank, TransactionWithBanks, Stall } from "@/lib/types";
import {
  TrendingUp,
  Check,
  Search,
  X,
  Store,
} from "lucide-react";

export default function SalesPage() {
  const { refreshSyncCount } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [sales, setSales] = useState<TransactionWithBanks[]>([]);
  const [search, setSearch] = useState("");

  // Form state
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [splitMode, setSplitMode] = useState(false);
  const [splitBank, setSplitBank] = useState("");
  const [splitAmount, setSplitAmount] = useState("");
  const [stallId, setStallId] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    const [b, txAll, txBanksAll, allBanks, st] = await Promise.all([
      db.banks.toArray(),
      db.transactions.where("type").equals("sale").reverse().sortBy("date"),
      db.transaction_banks.toArray(),
      db.banks.toArray(),
      db.stalls.where("status").equals("active").toArray(),
    ]);
    setBanks(b);
    setStalls(st);
    if (b.length > 0 && !selectedBank) setSelectedBank(b[0].id);
    setSales(
      txAll.map((tx) => ({
        ...tx,
        transaction_banks: txBanksAll
          .filter((tb) => tb.transaction_id === tx.id)
          .map((tb) => ({ ...tb, bank: allBanks.find((bk) => bk.id === tb.bank_id)! })),
      }))
    );
  }, [selectedBank]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const total = parseFloat(amount);
    if (!total || total <= 0) { toast.error("Enter a valid amount."); return; }
    if (!selectedBank) { toast.error("Select a bank account."); return; }

    if (splitMode && splitBank) {
      const sa = parseFloat(splitAmount || "0");
      if (Math.abs(sa + (total - sa) - total) > 0.01 || sa <= 0 || sa >= total) {
        toast.error("Split amounts must be valid.");
        return;
      }
    }

    setSaving(true);
    try {
      const txId = generateId();
      const txData: Transaction = {
        id: txId,
        type: "sale",
        amount: total,
        date,
        note: note.trim() || null,
        expense_category: null,
        stall_id: stallId || null,
        customer_id: null,
        synced: false,
        created_at: new Date().toISOString(),
      };

      let bankRows: TransactionBank[];
      if (splitMode && splitBank) {
        const sa = parseFloat(splitAmount);
        bankRows = [
          { id: generateId(), transaction_id: txId, bank_id: selectedBank, amount: total - sa },
          { id: generateId(), transaction_id: txId, bank_id: splitBank, amount: sa },
        ];
      } else {
        bankRows = [{ id: generateId(), transaction_id: txId, bank_id: selectedBank, amount: total }];
      }

      await db.transactions.put(txData);
      await db.transaction_banks.bulkPut(bankRows);

      if (navigator.onLine) {
        const { error } = await supabase.from("transactions").insert({ ...txData, synced: true });
        if (!error) {
          await supabase.from("transaction_banks").insert(bankRows);
          await db.transactions.update(txId, { synced: true } as Partial<Transaction>);
        }
      }

      refreshSyncCount();
      toast.success("Sale saved!");
      setAmount("");
      setNote("");
      setDate(today());
      setStallId("");
      setSplitMode(false);
      setSplitBank("");
      setSplitAmount("");
      loadAll();
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  // Summary
  const now = new Date();
  const monthSales = sales
    .filter((s) => { const d = new Date(s.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, t) => s + t.amount, 0);
  const todaySales = sales.filter((s) => s.date === today()).reduce((s, t) => s + t.amount, 0);
  const monthCount = sales.filter((s) => { const d = new Date(s.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

  // Search
  const filtered = search
    ? sales.filter((s) => s.note?.toLowerCase().includes(search.toLowerCase()) || s.transaction_banks.some((tb) => tb.bank?.name.toLowerCase().includes(search.toLowerCase())))
    : sales;

  // Group by date
  const grouped: Record<string, TransactionWithBanks[]> = {};
  for (const tx of filtered) {
    const label = tx.date === today() ? "Today" : tx.date === (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })() ? "Yesterday" : formatDate(tx.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(tx);
  }

  return (
    <div className="px-4 pt-5 pb-4 flex flex-col gap-4">
      {/* Header + Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Sales</h1>
          <p className="text-xs text-[var(--text-secondary)]">{monthCount} this month</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: "#306D29" }}>{formatINR(monthSales)}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Today: {formatINR(todaySales)}</p>
        </div>
      </div>

      {/* Desktop: side by side, Mobile: stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 card flex flex-col gap-3">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Quick Entry</p>

          {/* Amount */}
          <div className="flex items-center gap-2 bg-[var(--off-white)] rounded-xl px-4 py-3">
            <span className="text-2xl font-bold" style={{ color: "#306D29" }}>₹</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl font-bold bg-transparent outline-none flex-1"
              style={{ color: "#306D29" }}
              required
            />
          </div>

          {/* Bank chips */}
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-1.5">Account</p>
            <div className="flex flex-wrap gap-2">
              {banks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBank(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    selectedBank === b.id
                      ? "text-white border-transparent"
                      : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                  }`}
                  style={selectedBank === b.id ? { background: "#306D29" } : {}}
                >
                  {b.name}
                </button>
              ))}
            </div>
            {!splitMode && banks.length >= 2 && (
              <button type="button" onClick={() => setSplitMode(true)} className="text-[10px] font-semibold mt-1.5" style={{ color: "#306D29" }}>
                + Split across 2 banks
              </button>
            )}
            {splitMode && (
              <div className="flex items-center gap-2 mt-2">
                <select value={splitBank} onChange={(e) => setSplitBank(e.target.value)} className="flex-1 bg-[var(--off-white)] rounded-lg px-3 py-1.5 text-xs outline-none">
                  <option value="">2nd bank</option>
                  {banks.filter((b) => b.id !== selectedBank).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <input type="number" inputMode="decimal" placeholder="Amount" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} className="w-20 bg-[var(--off-white)] rounded-lg px-2 py-1.5 text-xs outline-none" />
                <button type="button" onClick={() => { setSplitMode(false); setSplitBank(""); setSplitAmount(""); }} className="text-xs text-[var(--danger)]">✕</button>
              </div>
            )}
          </div>

          {/* Stall */}
          {stalls.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-1.5">Stall</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setStallId("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${!stallId ? "bg-[var(--off-white)] text-[var(--text-primary)] border-[var(--border)]" : "bg-white text-[var(--text-secondary)] border-[var(--border)]"}`}>
                  None
                </button>
                {stalls.map((s) => (
                  <button key={s.id} type="button" onClick={() => setStallId(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${stallId === s.id ? "text-white border-transparent" : "bg-white text-[var(--text-secondary)] border-[var(--border)]"}`}
                    style={stallId === s.id ? { background: "#306D29" } : {}}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date + Note */}
          <div className="flex gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today()} className="flex-1 bg-[var(--off-white)] rounded-lg px-3 py-2 text-xs outline-none" />
            <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 bg-[var(--off-white)] rounded-lg px-3 py-2 text-xs outline-none placeholder:text-[var(--text-secondary)]" maxLength={200} />
          </div>

          {/* Save */}
          <button type="submit" disabled={saving} className="h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-white text-sm disabled:opacity-60" style={{ background: "#306D29" }}>
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={16} /> Save Sale</>}
          </button>
        </form>

        {/* Transaction list */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Search */}
          {sales.length > 3 && (
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-[var(--border)]">
              <Search size={14} className="text-[var(--text-secondary)]" />
              <input type="text" placeholder="Search sales..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none" />
              {search && <button onClick={() => setSearch("")}><X size={14} className="text-[var(--text-secondary)]" /></button>}
            </div>
          )}

          {/* Grouped list */}
          {Object.keys(grouped).length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-12">
              <TrendingUp size={32} className="text-[var(--border)]" />
              <p className="text-sm text-[var(--text-secondary)]">{search ? "No sales match your search" : "No sales recorded yet"}</p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, txs]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 px-1">{label}</p>
                <div className="card flex flex-col gap-0">
                  {txs.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                        <TrendingUp size={14} style={{ color: "#306D29" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "#306D29" }}>+{formatINR(tx.amount)}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {tx.transaction_banks.map((tb) => tb.bank?.name).join(" + ")}
                          {tx.note ? ` · ${tx.note}` : ""}
                          {tx.stall_id && (
                            <span className="inline-flex items-center gap-0.5 ml-1 px-1 py-0.5 rounded bg-green-50 text-green-700">
                              <Store size={8} /> stall
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] shrink-0">{formatDate(tx.date)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
