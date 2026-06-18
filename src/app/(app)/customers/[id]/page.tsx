"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";
import type { Customer, Transaction, DebtorEntry } from "@/lib/types";
import {
  ArrowLeft,
  Phone,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";

interface CustomerData extends Customer {
  transactions: Transaction[];
  debtorEntries: DebtorEntry[];
  totalPurchases: number;
  balance: number;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const customer = await db.customers.get(customerId);
    if (!customer) {
      router.replace("/customers");
      return;
    }

    const transactions = (await db.transactions.toArray()).filter(
      (t) => t.customer_id === customerId
    );

    let debtorEntries: DebtorEntry[] = [];
    let balance = 0;
    if (customer.debtor_id) {
      debtorEntries = (await db.debtor_entries.toArray()).filter(
        (e) => e.debtor_id === customer.debtor_id
      );
      balance = debtorEntries.reduce(
        (s, e) => s + (e.type === "credit_given" ? e.amount : -e.amount),
        0
      );
    }

    const totalPurchases = transactions
      .filter((t) => t.type === "sale")
      .reduce((s, t) => s + t.amount, 0);

    setData({
      ...customer,
      transactions,
      debtorEntries,
      totalPurchases,
      balance,
    });
    setLoading(false);
  }, [customerId, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sortedTx = [...data.transactions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const sortedEntries = [...data.debtorEntries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} className="text-[var(--text-primary)]" />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: "var(--forest-green)" }}>
          {data.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            {data.name}
          </h1>
          {data.phone && (
            <a
              href={`tel:${data.phone}`}
              className="flex items-center gap-1 text-xs text-[var(--text-secondary)]"
            >
              <Phone size={10} /> {data.phone}
            </a>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3">
        <div className="flex-1 card text-center py-3">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">
            Total Bought
          </p>
          <p className="text-lg font-bold text-[var(--success)]">
            {formatINR(data.totalPurchases)}
          </p>
        </div>
        {data.debtor_id && (
          <div className="flex-1 card text-center py-3">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase">
              {data.balance > 0 ? "Owes You" : "Settled"}
            </p>
            <p
              className="text-lg font-bold"
              style={{
                color: data.balance > 0 ? "var(--danger)" : "var(--success)",
              }}
            >
              {formatINR(Math.abs(data.balance))}
            </p>
          </div>
        )}
      </div>

      {/* Due warning */}
      {data.balance > 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
          <AlertCircle size={16} className="text-[var(--danger)]" />
          <p className="text-xs text-[var(--danger)] font-medium">
            This customer owes {formatINR(data.balance)}
          </p>
        </div>
      )}

      {/* Purchase history */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Purchase History ({sortedTx.length})
        </p>
        {sortedTx.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
            No purchases linked to this customer yet.
          </p>
        ) : (
          sortedTx.map((tx) => (
            <div key={tx.id} className="card flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-[var(--success)]" />
                  <p className="text-sm font-semibold text-[var(--success)]">
                    {formatINR(tx.amount)}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                    {tx.type}
                  </span>
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

      {/* Debtor timeline */}
      {data.debtor_id && sortedEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Credit Timeline ({sortedEntries.length})
          </p>
          {sortedEntries.map((entry) => {
            const isCredit = entry.type === "credit_given";
            return (
              <div key={entry.id} className="card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    {isCredit ? (
                      <TrendingDown size={12} className="text-[var(--danger)]" />
                    ) : (
                      <TrendingUp size={12} className="text-[var(--success)]" />
                    )}
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: isCredit ? "var(--danger)" : "var(--success)",
                      }}
                    >
                      {formatINR(entry.amount)}
                    </p>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: isCredit ? "#fef2f2" : "#f0fdf4",
                        color: isCredit ? "#b91c1c" : "#15803d",
                      }}
                    >
                      {isCredit ? "Credit Given" : "Payment Received"}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {entry.note}
                    </p>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatDate(entry.date)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
