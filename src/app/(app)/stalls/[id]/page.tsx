"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, formatDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import type { Stall, Transaction } from "@/lib/types";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Edit3,
  Save,
} from "lucide-react";

interface StallData extends Stall {
  sales: Transaction[];
  expenses: Transaction[];
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

export default function StallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { refreshSyncCount } = useAuth();
  const stallId = params.id as string;

  const [data, setData] = useState<StallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [footfall, setFootfall] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async () => {
    const stall = await db.stalls.get(stallId);
    if (!stall) {
      router.replace("/stalls");
      return;
    }

    const allTx = await db.transactions.where("stall_id").equals(stallId).toArray();
    const sales = allTx.filter((t) => t.type === "sale");
    const expenses = allTx.filter((t) => t.type === "expense" || t.type === "purchase");
    const totalSales = sales.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

    setData({
      ...stall,
      sales,
      expenses,
      totalSales,
      totalExpenses,
      profit: totalSales - totalExpenses - stall.stall_rental_fee,
    });
    setFootfall(String(stall.customer_footfall || ""));
    setEndDate(stall.end_date || "");
    setLoading(false);
  }, [stallId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function markCompleted() {
    if (!data) return;
    await db.stalls.update(stallId, { status: "completed", synced: false } as Partial<Stall>);
    if (navigator.onLine) {
      await supabase.from("stalls").update({ status: "completed" }).eq("id", stallId);
      await db.stalls.update(stallId, { synced: true } as Partial<Stall>);
    }
    refreshSyncCount();
    toast.success("Stall marked as completed!");
    load();
  }

  async function saveEdits() {
    const updates: Partial<Stall> = {
      customer_footfall: parseInt(footfall) || 0,
      end_date: endDate || null,
      synced: false,
    };
    await db.stalls.update(stallId, updates);
    if (navigator.onLine) {
      await supabase
        .from("stalls")
        .update({ ...updates, synced: true })
        .eq("id", stallId);
      await db.stalls.update(stallId, { synced: true } as Partial<Stall>);
    }
    refreshSyncCount();
    setEditing(false);
    toast.success("Updated!");
    load();
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = data.status === "active";

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} className="text-[var(--text-primary)]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            {data.name}
          </h1>
          <div className="flex items-center gap-1">
            <MapPin size={11} className="text-[var(--text-secondary)]" />
            <p className="text-xs text-[var(--text-secondary)]">{data.place}</p>
          </div>
        </div>
        {isActive && (
          <button
            onClick={() => setEditing(!editing)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--off-white)]"
          >
            <Edit3 size={14} className="text-[var(--text-secondary)]" />
          </button>
        )}
      </div>

      {/* Status + dates */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {data.status}
          </span>
          {data.customer_footfall > 0 && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Users size={12} />
              {data.customer_footfall} visitors
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <Calendar size={12} />
          {formatDate(data.start_date)}
          {data.end_date ? ` — ${formatDate(data.end_date)}` : " — ongoing"}
        </div>

        {data.stall_rental_fee > 0 && (
          <p className="text-xs text-[var(--text-secondary)]">
            Rental: {formatINR(data.stall_rental_fee)}
          </p>
        )}

        {/* Edit fields */}
        {editing && (
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2 outline-none"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                  Footfall
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={footfall}
                  onChange={(e) => setFootfall(e.target.value)}
                  className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2 outline-none"
                />
              </div>
            </div>
            <button
              onClick={saveEdits}
              className="h-10 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "var(--forest-green)" }}
            >
              <Save size={14} /> Save
            </button>
          </div>
        )}
      </div>

      {/* Profit summary */}
      <div
        className="rounded-2xl p-4 text-white"
        style={{ background: "linear-gradient(135deg, #5A7D60, #6B8F71)" }}
      >
        <p className="text-[10px] uppercase tracking-wider opacity-70">
          Stall Profit
        </p>
        <p className="text-2xl font-bold mt-1">
          {formatINR(data.profit)}
        </p>
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/20 text-xs">
          <div className="flex-1">
            <p className="opacity-60">Sales</p>
            <p className="font-semibold">{formatINR(data.totalSales)}</p>
          </div>
          <div className="flex-1">
            <p className="opacity-60">Expenses</p>
            <p className="font-semibold">
              {formatINR(data.totalExpenses + data.stall_rental_fee)}
            </p>
          </div>
        </div>
      </div>

      {/* Mark completed */}
      {isActive && (
        <button
          onClick={markCompleted}
          className="h-12 rounded-xl border-2 border-[var(--forest-green)] text-[var(--forest-green)] font-semibold text-sm flex items-center justify-center gap-2"
        >
          <CheckCircle size={16} /> Mark as Completed
        </button>
      )}

      {/* Sales */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Sales ({data.sales.length})
        </p>
        {data.sales.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
            No sales linked to this stall yet.
          </p>
        ) : (
          data.sales
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((tx) => (
              <div key={tx.id} className="card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-[var(--success)]" />
                    <p className="text-sm font-semibold text-[var(--success)]">
                      {formatINR(tx.amount)}
                    </p>
                  </div>
                  {tx.note && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {tx.note}
                    </p>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatDate(tx.date)}
                </p>
              </div>
            ))
        )}
      </div>

      {/* Expenses */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Expenses ({data.expenses.length})
        </p>
        {data.expenses.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
            No expenses linked to this stall yet.
          </p>
        ) : (
          data.expenses
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((tx) => (
              <div key={tx.id} className="card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown size={12} className="text-[var(--danger)]" />
                    <p className="text-sm font-semibold text-[var(--danger)]">
                      {formatINR(tx.amount)}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {tx.expense_category?.replace("_", " ") || tx.type}
                    {tx.note ? ` · ${tx.note}` : ""}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatDate(tx.date)}
                </p>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
