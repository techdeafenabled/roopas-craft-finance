"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, generateId } from "@/lib/format";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Customer, DebtorEntry } from "@/lib/types";
import { Users, Plus, ChevronRight, Search, X, Phone } from "lucide-react";

interface CustomerRow extends Customer {
  totalPurchases: number;
  balance: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    const [allCustomers, allTx, allDebtorEntries] = await Promise.all([
      db.customers.toArray(),
      db.transactions.toArray(),
      db.debtor_entries.toArray(),
    ]);

    const enriched: CustomerRow[] = allCustomers.map((c) => {
      const txs = allTx.filter((t) => t.customer_id === c.id && t.type === "sale");
      const totalPurchases = txs.reduce((s, t) => s + t.amount, 0);

      let balance = 0;
      if (c.debtor_id) {
        const entries = allDebtorEntries.filter((e) => e.debtor_id === c.debtor_id);
        balance = entries.reduce((s, e) => {
          return s + (e.type === "credit_given" ? e.amount : -e.amount);
        }, 0);
      }

      return { ...c, totalPurchases, balance };
    });

    enriched.sort((a, b) => a.name.localeCompare(b.name));
    setCustomers(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter customer name.");
      return;
    }
    setSaving(true);
    try {
      const customer: Customer = {
        id: generateId(),
        name: name.trim(),
        phone: phone.trim() || null,
        debtor_id: null,
        notes: null,
        created_at: new Date().toISOString(),
      };
      await db.customers.put(customer);
      if (navigator.onLine) {
        await supabase.from("customers").insert(customer);
      }
      toast.success("Customer added!");
      setShowAdd(false);
      setName("");
      setPhone("");
      load();
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = search
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search)
      )
    : customers;

  const totalDues = customers.reduce((s, c) => s + Math.max(c.balance, 0), 0);

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
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Customers
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {customers.length} customers
            {totalDues > 0 && ` · ${formatINR(totalDues)} dues`}
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

      {/* Search */}
      {customers.length > 3 && (
        <div className="flex items-center gap-2 bg-[var(--off-white)] rounded-xl px-3 py-2">
          <Search size={16} className="text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">New Customer</p>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X size={18} className="text-[var(--text-secondary)]" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Customer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
            required
          />
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-sm bg-[var(--off-white)] rounded-lg px-3 py-2.5 outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
            style={{ background: "var(--forest-green)" }}
          >
            {saving ? "Saving..." : "Add Customer"}
          </button>
        </form>
      )}

      {/* Customer list */}
      <div className="flex flex-col gap-2">
        {filtered.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`}>
            <div className="card flex items-center gap-3 active:scale-[0.98] transition-transform">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "var(--forest-green)" }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {c.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  {c.phone && (
                    <span className="flex items-center gap-0.5">
                      <Phone size={10} /> {c.phone}
                    </span>
                  )}
                  {c.totalPurchases > 0 && (
                    <span>Bought: {formatINR(c.totalPurchases)}</span>
                  )}
                </div>
              </div>
              {c.balance > 0 && (
                <p className="text-xs font-semibold text-[var(--danger)]">
                  {formatINR(c.balance)}
                </p>
              )}
              <ChevronRight size={14} className="text-[var(--text-secondary)]" />
            </div>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Users size={48} className="text-[var(--border)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            {search ? "No customers match your search." : "No customers yet. Tap + to add one."}
          </p>
        </div>
      )}
    </div>
  );
}
