"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, generateId } from "@/lib/format";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Investment, InvestmentEntry, InvestmentType } from "@/lib/types";
import { PiggyBank, Plus, ChevronRight, X } from "lucide-react";

interface InvestmentRow extends Investment {
  balance: number;
}

const TYPES: { value: InvestmentType; label: string }[] = [
  { value: "fd", label: "Fixed Deposit" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "gold", label: "Gold" },
  { value: "stocks", label: "Stocks" },
  { value: "other", label: "Other" },
];

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [invType, setInvType] = useState<InvestmentType>("fd");

  const load = useCallback(async () => {
    const [all, entries] = await Promise.all([
      db.investments.toArray(),
      db.investment_entries.toArray(),
    ]);

    const enriched: InvestmentRow[] = all.map((inv) => {
      const invEntries = entries.filter((e) => e.investment_id === inv.id);
      const balance = invEntries.reduce(
        (s, e) => s + (e.type === "invest" ? e.amount : -e.amount),
        0
      );
      return { ...inv, balance };
    });

    enriched.sort((a, b) => b.balance - a.balance);
    setInvestments(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter investment name.");
      return;
    }
    setSaving(true);
    try {
      const inv: Investment = {
        id: generateId(),
        name: name.trim(),
        type: invType,
        notes: null,
        created_at: new Date().toISOString(),
      };
      await db.investments.put(inv);
      if (navigator.onLine) {
        await supabase.from("investments").insert(inv);
      }
      toast.success("Investment added!");
      setShowAdd(false);
      setName("");
      load();
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const totalInvested = investments.reduce((s, i) => s + Math.max(i.balance, 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Investments</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Total invested: {formatINR(totalInvested)}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white"
          style={{ background: "var(--forest-green)" }}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">New Investment</p>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X size={18} className="text-[var(--text-secondary)]" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Name (e.g. SBI Fixed Deposit)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
            required
          />
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setInvType(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  invType === t.value
                    ? "text-white border-transparent"
                    : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                }`}
                style={invType === t.value ? { background: "var(--forest-green)" } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
            style={{ background: "var(--forest-green)" }}
          >
            {saving ? "Saving..." : "Add Investment"}
          </button>
        </form>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {investments.map((inv) => (
          <Link key={inv.id} href={`/investments/${inv.id}`}>
            <div className="card flex items-center gap-3 active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
                <PiggyBank size={18} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{inv.name}</p>
                <p className="text-xs text-[var(--text-secondary)] capitalize">
                  {inv.type?.replace("_", " ") || "Other"}
                </p>
              </div>
              <p className="text-sm font-bold" style={{ color: "var(--forest-green)" }}>
                {formatINR(inv.balance)}
              </p>
              <ChevronRight size={14} className="text-[var(--text-secondary)]" />
            </div>
          </Link>
        ))}
      </div>

      {investments.length === 0 && !showAdd && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <PiggyBank size={48} className="text-[var(--border)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            No investments yet. Tap + to add one.
          </p>
        </div>
      )}
    </div>
  );
}
