"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, formatDate, generateId, today } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import type { Creditor, CreditorEntry, CreditorInstallmentPlan, InstallmentFrequency } from "@/lib/types";
import {
  ArrowLeft,
  Phone,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  X,
} from "lucide-react";

interface PageData extends Creditor {
  entries: CreditorEntry[];
  balance: number;
  plan: CreditorInstallmentPlan | null;
}

export default function CreditorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { refreshSyncCount } = useAuth();
  const creditorId = params.id as string;

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);

  // Plan form
  const [planTotal, setPlanTotal] = useState("");
  const [planInstallment, setPlanInstallment] = useState("");
  const [planFreq, setPlanFreq] = useState<InstallmentFrequency>("monthly");
  const [planStart, setPlanStart] = useState(today());
  const [planCount, setPlanCount] = useState("");

  // Entry form
  const [entryType, setEntryType] = useState<"credit_taken" | "payment_made">("payment_made");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDate, setEntryDate] = useState(today());
  const [entryNote, setEntryNote] = useState("");

  const load = useCallback(async () => {
    const creditor = await db.creditors.get(creditorId);
    if (!creditor) {
      router.replace("/creditors");
      return;
    }

    const entries = (await db.creditor_entries.toArray()).filter(
      (e) => e.creditor_id === creditorId
    );
    const balance = entries.reduce(
      (s, e) => s + (e.type === "credit_taken" ? e.amount : -e.amount),
      0
    );

    const plans = await db.creditor_installment_plans
      .where("creditor_id")
      .equals(creditorId)
      .toArray();

    setData({
      ...creditor,
      entries,
      balance,
      plan: plans[0] || null,
    });
    setLoading(false);
  }, [creditorId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function savePlan() {
    const total = parseFloat(planTotal);
    if (!total || total <= 0) {
      toast.error("Enter total amount.");
      return;
    }
    const plan: CreditorInstallmentPlan = {
      id: generateId(),
      creditor_id: creditorId,
      total_amount: total,
      installment_amount: parseFloat(planInstallment) || null,
      frequency: planFreq,
      start_date: planStart,
      num_installments: parseInt(planCount) || null,
      note: null,
      created_at: new Date().toISOString(),
    };
    await db.creditor_installment_plans.put(plan);
    if (navigator.onLine) {
      await supabase.from("creditor_installment_plans").insert(plan);
    }
    toast.success("Installment plan saved!");
    setShowPlanForm(false);
    load();
  }

  async function addEntry() {
    const amt = parseFloat(entryAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter valid amount.");
      return;
    }
    const entry: CreditorEntry = {
      id: generateId(),
      creditor_id: creditorId,
      type: entryType,
      amount: amt,
      bank_id: null,
      date: entryDate,
      note: entryNote.trim() || null,
      synced: false,
      created_at: new Date().toISOString(),
    };
    await db.creditor_entries.put(entry as CreditorEntry);
    if (navigator.onLine) {
      const { error } = await supabase
        .from("creditor_entries")
        .insert({ ...entry, synced: true });
      if (!error)
        await db.creditor_entries.update(entry.id, {
          synced: true,
        } as Partial<CreditorEntry>);
    }
    refreshSyncCount();
    toast.success("Entry saved!");
    setShowEntryForm(false);
    setEntryAmount("");
    setEntryNote("");
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
  const totalPaid = data.entries
    .filter((e) => e.type === "payment_made")
    .reduce((s, e) => s + e.amount, 0);
  const planProgress = data.plan
    ? Math.min((totalPaid / data.plan.total_amount) * 100, 100)
    : 0;

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} className="text-[var(--text-primary)]" />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: "var(--danger)" }}>
          {data.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            {data.name}
          </h1>
          {data.phone && (
            <a href={`tel:${data.phone}`} className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Phone size={10} /> {data.phone}
            </a>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="card text-center py-4">
        <p className="text-[10px] text-[var(--text-secondary)] uppercase">
          You Owe
        </p>
        <p className="text-2xl font-bold" style={{ color: data.balance > 0 ? "var(--danger)" : "var(--success)" }}>
          {formatINR(Math.abs(data.balance))}
        </p>
      </div>

      {/* Installment plan */}
      {data.plan ? (
        <div className="card flex flex-col gap-3">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Installment Plan
          </p>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">
              Total: {formatINR(data.plan.total_amount)}
            </span>
            <span className="text-[var(--text-secondary)]">
              {data.plan.frequency === "flexible"
                ? "Flexible"
                : `${formatINR(data.plan.installment_amount || 0)} / ${data.plan.frequency}`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${planProgress}%`,
                background: planProgress >= 100 ? "var(--success)" : "var(--forest-green)",
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>Paid: {formatINR(totalPaid)}</span>
            <span>{Math.round(planProgress)}%</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowPlanForm(true)}
          className="card flex items-center justify-center gap-2 py-3 text-sm font-semibold"
          style={{ color: "var(--forest-green)" }}
        >
          <Calendar size={16} /> Set Installment Plan
        </button>
      )}

      {/* Plan form */}
      {showPlanForm && (
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">New Plan</p>
            <button onClick={() => setShowPlanForm(false)}>
              <X size={18} className="text-[var(--text-secondary)]" />
            </button>
          </div>
          <input
            type="number" inputMode="decimal" placeholder="Total amount owed"
            value={planTotal} onChange={(e) => setPlanTotal(e.target.value)}
            className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
          />
          <div className="flex gap-2">
            {(["weekly", "monthly", "quarterly", "flexible"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setPlanFreq(f)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border capitalize ${
                  planFreq === f
                    ? "text-white border-transparent"
                    : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                }`}
                style={planFreq === f ? { background: "var(--forest-green)" } : {}}
              >
                {f}
              </button>
            ))}
          </div>
          {planFreq !== "flexible" && (
            <div className="flex gap-2">
              <input
                type="number" inputMode="decimal" placeholder="Amount per installment"
                value={planInstallment} onChange={(e) => setPlanInstallment(e.target.value)}
                className="flex-1 text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
              />
              <input
                type="number" inputMode="numeric" placeholder="# payments"
                value={planCount} onChange={(e) => setPlanCount(e.target.value)}
                className="w-24 text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
              />
            </div>
          )}
          <input
            type="date" value={planStart} onChange={(e) => setPlanStart(e.target.value)}
            className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2 outline-none"
          />
          <button
            onClick={savePlan}
            className="h-11 rounded-xl text-white font-semibold text-sm"
            style={{ background: "var(--forest-green)" }}
          >
            Save Plan
          </button>
        </div>
      )}

      {/* Add entry button */}
      <button
        onClick={() => setShowEntryForm(!showEntryForm)}
        className="h-11 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2"
        style={{
          borderColor: "var(--forest-green)",
          color: "var(--forest-green)",
        }}
      >
        <Plus size={16} /> Add Entry
      </button>

      {/* Entry form */}
      {showEntryForm && (
        <div className="card flex flex-col gap-3">
          <div className="flex gap-2">
            {(["credit_taken", "payment_made"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setEntryType(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                  entryType === t
                    ? "text-white border-transparent"
                    : "bg-white text-[var(--text-secondary)] border-[var(--border)]"
                }`}
                style={
                  entryType === t
                    ? { background: t === "credit_taken" ? "var(--danger)" : "var(--success)" }
                    : {}
                }
              >
                {t === "credit_taken" ? "Credit Taken" : "Payment Made"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">&#8377;</span>
            <input
              type="number" inputMode="decimal" placeholder="Amount"
              value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)}
              className="flex-1 bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <input
            type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
            max={today()} className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            type="text" placeholder="Note (optional)"
            value={entryNote} onChange={(e) => setEntryNote(e.target.value)}
            className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowEntryForm(false)} className="flex-1 py-2.5 rounded-lg text-xs font-semibold border border-[var(--border)]">
              Cancel
            </button>
            <button onClick={addEntry} className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--forest-green)" }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Entry history */}
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
            const isCredit = e.type === "credit_taken";
            return (
              <div key={e.id} className="card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    {isCredit ? (
                      <TrendingDown size={12} className="text-[var(--danger)]" />
                    ) : (
                      <TrendingUp size={12} className="text-[var(--success)]" />
                    )}
                    <p className="text-sm font-semibold" style={{ color: isCredit ? "var(--danger)" : "var(--success)" }}>
                      {formatINR(e.amount)}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: isCredit ? "#fef2f2" : "#f0fdf4", color: isCredit ? "#b91c1c" : "#15803d" }}>
                      {isCredit ? "Credit Taken" : "Payment Made"}
                    </span>
                  </div>
                  {e.note && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{e.note}</p>
                  )}
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
