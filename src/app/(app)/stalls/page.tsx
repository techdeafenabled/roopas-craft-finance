"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, formatDate, generateId, today } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Stall, Transaction } from "@/lib/types";
import {
  Store,
  Plus,
  MapPin,
  Calendar,
  TrendingUp,
  ChevronRight,
  Users,
  X,
} from "lucide-react";

interface StallWithProfit extends Stall {
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

export default function StallsPage() {
  const { refreshSyncCount } = useAuth();
  const [stalls, setStalls] = useState<StallWithProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [rentalFee, setRentalFee] = useState("");
  const [footfall, setFootfall] = useState("");

  const load = useCallback(async () => {
    const [allStalls, allTx] = await Promise.all([
      db.stalls.toArray(),
      db.transactions.toArray(),
    ]);

    const enriched: StallWithProfit[] = allStalls
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
      .map((s) => {
        const stallTx = allTx.filter((t) => t.stall_id === s.id);
        const totalSales = stallTx
          .filter((t) => t.type === "sale")
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = stallTx
          .filter((t) => t.type === "expense" || t.type === "purchase")
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          ...s,
          totalSales,
          totalExpenses,
          profit: totalSales - totalExpenses - s.stall_rental_fee,
        };
      });

    setStalls(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !place.trim()) {
      toast.error("Enter stall name and place.");
      return;
    }
    setSaving(true);
    try {
      const stall: Stall = {
        id: generateId(),
        name: name.trim(),
        place: place.trim(),
        start_date: startDate,
        end_date: endDate || null,
        stall_rental_fee: parseFloat(rentalFee) || 0,
        customer_footfall: parseInt(footfall) || 0,
        status: "active",
        synced: false,
        created_at: new Date().toISOString(),
      };
      await db.stalls.put(stall);
      if (navigator.onLine) {
        const { error } = await supabase
          .from("stalls")
          .insert({ ...stall, synced: true });
        if (!error)
          await db.stalls.update(stall.id, {
            synced: true,
          } as Partial<Stall>);
      }
      refreshSyncCount();
      toast.success("Stall created!");
      setShowAdd(false);
      setName("");
      setPlace("");
      setStartDate(today());
      setEndDate("");
      setRentalFee("");
      setFootfall("");
      load();
    } catch {
      toast.error("Failed to save stall.");
    } finally {
      setSaving(false);
    }
  }

  const activeStalls = stalls.filter((s) => s.status === "active");
  const completedStalls = stalls.filter((s) => s.status === "completed");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Stalls
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {stalls.length} total &middot; {activeStalls.length} active
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
            <p className="text-sm font-bold text-[var(--text-primary)]">
              New Stall
            </p>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X size={18} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Stall name (e.g. Dilli Haat)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
            required
          />

          <input
            type="text"
            placeholder="Place / Location"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
            required
          />

          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2 outline-none"
                required
              />
            </div>
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
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                Rental fee (&#8377;)
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={rentalFee}
                onChange={(e) => setRentalFee(e.target.value)}
                className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                Footfall
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={footfall}
                onChange={(e) => setFootfall(e.target.value)}
                className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
            style={{ background: "var(--forest-green)" }}
          >
            {saving ? "Saving..." : "Create Stall"}
          </button>
        </form>
      )}

      {/* Active stalls */}
      {activeStalls.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Active
          </p>
          {activeStalls.map((s) => (
            <StallCard key={s.id} stall={s} />
          ))}
        </div>
      )}

      {/* Completed stalls */}
      {completedStalls.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Completed
          </p>
          {completedStalls.map((s) => (
            <StallCard key={s.id} stall={s} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {stalls.length === 0 && !showAdd && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Store size={48} className="text-[var(--border)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            No stalls yet. Tap + to add your first stall.
          </p>
        </div>
      )}
    </div>
  );
}

function StallCard({ stall }: { stall: StallWithProfit }) {
  const isActive = stall.status === "active";

  return (
    <Link href={`/stalls/${stall.id}`}>
      <div className="card flex flex-col gap-2 active:scale-[0.98] transition-transform">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Store
                size={14}
                className={isActive ? "text-[var(--forest-green)]" : "text-[var(--text-secondary)]"}
              />
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {stall.name}
              </p>
              {isActive && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-100 text-green-700">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-[var(--text-secondary)]" />
              <p className="text-xs text-[var(--text-secondary)]">
                {stall.place}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] mt-1" />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Calendar size={11} className="text-[var(--text-secondary)]" />
            <span className="text-[var(--text-secondary)]">
              {formatDate(stall.start_date)}
              {stall.end_date ? ` — ${formatDate(stall.end_date)}` : ""}
            </span>
          </div>
          {stall.customer_footfall > 0 && (
            <div className="flex items-center gap-1">
              <Users size={11} className="text-[var(--text-secondary)]" />
              <span className="text-[var(--text-secondary)]">
                {stall.customer_footfall}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-1 border-t border-[var(--border)]">
          <div className="flex-1">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">
              Sales
            </p>
            <p className="text-sm font-bold text-[var(--success)]">
              {formatINR(stall.totalSales)}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">
              Expenses
            </p>
            <p className="text-sm font-bold text-[var(--danger)]">
              {formatINR(stall.totalExpenses + stall.stall_rental_fee)}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">
              Profit
            </p>
            <p
              className="text-sm font-bold"
              style={{ color: stall.profit >= 0 ? "var(--success)" : "var(--danger)" }}
            >
              {formatINR(stall.profit)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
