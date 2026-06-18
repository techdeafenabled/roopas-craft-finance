"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, formatDate, generateId, today } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import type { Investment, InvestmentEntry, Bank } from "@/lib/types";
import { ArrowLeft, TrendingUp, TrendingDown, Plus, X } from "lucide-react";

interface PageData extends Investment {
  entries: InvestmentEntry[];
  balance: number;
}

export default function InvestmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { refreshSyncCount } = useAuth();
  const investmentId = params.id as string;

  const [data, setData] = useState<PageData | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [entryType, setEntryType] = useState<"invest" | "withdraw">("invest");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [investment, allBanks] = await Promise.all([
      db.investments.get(investmentId),
      db.banks.toArray(),
    ]);
    if (!investment) {
      router.replace("/investments");
      return;
    }

    const entries = (await db.investment_entries.toArray()).filter(
      (e) => e.investment_id === investmentId
    );
    const balance = entries.reduce(
      (s, e) => s + (e.type === "invest" ? e.amount : -e.amount),
      0
    );

    setData({ ...investment, entries, balance });
    setBanks(allBanks);
    if (allBanks.length > 0 && !bankId) setBankId(allBanks[0].id);
    setLoading(false);
  }, [investmentId, router, bankId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter valid amount.");
      return;
    }
    if (!bankId) {
      toast.error("Select a bank.");
      return;
    }

    const entry: InvestmentEntry = {
      id: generateId(),
      investment_id: investmentId,
      type: entryType,
      amount: amt,
      bank_id: bankId,
      date,
      note: note.trim() || null,
      synced: false,
      created_at: new Date().toISOString(),
    };

    await db.investment_entries.put(entry);
    if (navigator.onLine) {
      const { error } = await supabase
        .from("investment_entries")
        .insert({ ...entry, synced: true });
      if (!error)
        await db.investment_entries.update(entry.id, {
          synced: true,
        } as Partial<InvestmentEntry>);
    }

    refreshSyncCount();
    toast.success(entryType === "invest" ? "Invested!" : "Withdrawn!");
    setShowForm(false);
    setAmount("");
    setNote("");
    load();
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sortedEntries = [...data.entries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const totalInvested = data.entries
    .filter((e) => e.type === "invest")
    .reduce((s, e) => s + e.amount, 0);
  const totalWithdrawn = data.entries
    .filter((e) => e.type === "withdraw")
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} className="text-[var(--text-primary)]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">{data.name}</h1>
          <p className="text-xs text-[var(--text-secondary)] capitalize">
            {data.type?.replace("_", " ") || "Other"}
          </p>
        </div>
      </div>

      {/* Balance card */}
      <div
        className="rounded-2xl p-4 text-white"
        style={{ background: "linear-gradient(135deg, #065f46, #059669)" }}
      >
        <p className="text-[10px] uppercase tracking-wider opacity-70">
          Current Balance
        </p>
        <p className="text-2xl font-bold mt-1">{formatINR(data.balance)}</p>
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/20 text-xs">
          <div className="flex-1">
            <p className="opacity-60">Invested</p>
            <p className="font-semibold">{formatINR(totalInvested)}</p>
          </div>
          <div className="flex-1">
            <p className="opacity-60">Withdrawn</p>
            <p className="font-semibold">{formatINR(totalWithdrawn)}</p>
          </div>
        </div>
      </div>

      {/* Add entry button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="h-11 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2"
        style={{ borderColor: "var(--forest-green)", color: "var(--forest-green)" }}
      >
        <Plus size={16} /> {showForm ? "Cancel" : "Add Entry"}
      </button>

      {/* Entry form */}
      {showForm && (
        <div className="card flex flex-col gap-3">
          <div className="flex gap-2">
            {(["invest", "withdraw"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setEntryType(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize ${
                  entryType === t
                    ? "text-white border-transparent"
                    : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                }`}
                style={entryType === t ? { background: t === "invest" ? "var(--forest-green)" : "var(--warning)" } : {}}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">&#8377;</span>
            <input
              type="number" inputMode="decimal" placeholder="Amount"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-[var(--off-white)] rounded-lg px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <select
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            className="bg-[var(--off-white)] rounded-lg px-3 py-2.5 text-sm outline-none"
          >
            <option value="">Select bank</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            max={today()} className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            type="text" placeholder="Note (optional)"
            value={note} onChange={(e) => setNote(e.target.value)}
            className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={addEntry}
            className="h-11 rounded-xl text-white font-semibold text-sm"
            style={{ background: "var(--forest-green)" }}
          >
            Save
          </button>
        </div>
      )}

      {/* History */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          History ({sortedEntries.length})
        </p>
        {sortedEntries.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
            No entries yet.
          </p>
        ) : (
          sortedEntries.map((e) => {
            const isInvest = e.type === "invest";
            const bank = banks.find((b) => b.id === e.bank_id);
            return (
              <div key={e.id} className="card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    {isInvest ? (
                      <TrendingUp size={12} className="text-emerald-600" />
                    ) : (
                      <TrendingDown size={12} className="text-amber-600" />
                    )}
                    <p className="text-sm font-semibold" style={{ color: isInvest ? "#059669" : "#d97706" }}>
                      {formatINR(e.amount)}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: isInvest ? "#ecfdf5" : "#fffbeb", color: isInvest ? "#065f46" : "#92400e" }}>
                      {e.type}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {bank?.name || "Unknown bank"}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{formatDate(e.date)}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
