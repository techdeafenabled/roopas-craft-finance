"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";
import { TrendingUp, ShoppingBag, Receipt, Filter } from "lucide-react";
import type { TransactionWithBanks, TransactionType } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  stall: "Stall",
  fuel: "Fuel",
  food: "Food",
  travel: "Travel",
  salary: "Salary",
  other: "Other",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithBanks[]>([]);
  const [filter, setFilter] = useState<TransactionType | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [txAll, txBanksAll, banks] = await Promise.all([
        db.transactions.toArray(),
        db.transaction_banks.toArray(),
        db.banks.toArray(),
      ]);
      const sorted = [...txAll].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTransactions(
        sorted.map((tx) => ({
          ...tx,
          transaction_banks: txBanksAll
            .filter((tb) => tb.transaction_id === tx.id)
            .map((tb) => ({ ...tb, bank: banks.find((b) => b.id === tb.bank_id)! })),
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  const icons = {
    sale: <TrendingUp size={16} className="text-sale" />,
    purchase: <ShoppingBag size={16} className="text-purchase" />,
    expense: <Receipt size={16} className="text-expense" />,
  };

  const bgColors = {
    sale: "bg-green-50",
    purchase: "bg-amber-50",
    expense: "bg-red-50",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--forest-green)" }}>
          <Filter size={18} color="white" />
        </div>
        <h1 className="text-xl font-bold">All Transactions</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-[var(--off-white)] rounded-xl p-1 gap-1">
        {(["all", "sale", "purchase", "expense"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === f ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)] text-sm">No transactions found.</div>
        ) : (
          filtered.map((tx) => (
            <div key={tx.id} className="card flex items-center gap-3 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bgColors[tx.type]}`}>
                {icons[tx.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold capitalize">
                  {tx.type === "expense" && tx.expense_category
                    ? CATEGORY_LABELS[tx.expense_category]
                    : tx.type}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {tx.transaction_banks.map((tb) => `${tb.bank?.name}${tb.amount !== tx.amount ? ` ₹${tb.amount}` : ""}`).join(" + ")}
                  {tx.note ? ` · ${tx.note}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${tx.type === "sale" ? "text-sale" : tx.type === "purchase" ? "text-purchase" : "text-expense"}`}>
                  {tx.type === "sale" ? "+" : "-"}{formatINR(tx.amount)}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{formatDate(tx.date)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
