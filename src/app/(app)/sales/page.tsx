"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";
import EntryForm from "@/components/EntryForm";
import { TrendingUp } from "lucide-react";
import type { TransactionWithBanks } from "@/lib/types";

export default function SalesPage() {
  const [tab, setTab] = useState<"add" | "history">("add");
  const [sales, setSales] = useState<TransactionWithBanks[]>([]);

  const loadSales = useCallback(async () => {
    const [txAll, txBanksAll, banks] = await Promise.all([
      db.transactions.where("type").equals("sale").reverse().sortBy("date"),
      db.transaction_banks.toArray(),
      db.banks.toArray(),
    ]);
    setSales(
      txAll.map((tx) => ({
        ...tx,
        transaction_banks: txBanksAll
          .filter((tb) => tb.transaction_id === tx.id)
          .map((tb) => ({ ...tb, bank: banks.find((b) => b.id === tb.bank_id)! })),
      }))
    );
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
          <TrendingUp size={20} className="text-sale" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Sales</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--off-white)] rounded-xl p-1">
        {(["add", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
              tab === t ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            {t === "add" ? "Add Sale" : "History"}
          </button>
        ))}
      </div>

      {tab === "add" ? (
        <EntryForm type="sale" onSuccess={loadSales} />
      ) : (
        <div className="flex flex-col gap-2">
          {sales.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
              No sales recorded yet.
            </div>
          ) : (
            sales.map((tx) => (
              <div key={tx.id} className="card flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <TrendingUp size={16} className="text-sale" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sale">{formatINR(tx.amount)}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {tx.transaction_banks.map((tb) => `${tb.bank?.name}${tb.amount !== tx.amount ? ` ₹${tb.amount}` : ""}`).join(" + ")}
                    {tx.note ? ` · ${tx.note}` : ""}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] shrink-0">{formatDate(tx.date)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
