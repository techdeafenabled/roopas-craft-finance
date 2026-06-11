"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { formatINR, formatDate, today } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import SyncBadge from "@/components/SyncBadge";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Landmark,
  Users,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import type { Bank, TransactionWithBanks } from "@/lib/types";

interface DashboardData {
  banks: (Bank & { balance: number })[];
  todaySales: number;
  todayPurchases: number;
  todayExpenses: number;
  recentTransactions: TransactionWithBanks[];
  totalDebtors: number;
  totalCreditors: number;
}

export default function DashboardPage() {
  const { refreshSyncCount } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const todayStr = today();

  useEffect(() => {
    async function load() {
      const [banks, txAll, txBanksAll, debtorEntries, creditorEntries] =
        await Promise.all([
          db.banks.toArray(),
          db.transactions.toArray(),
          db.transaction_banks.toArray(),
          db.debtor_entries.toArray(),
          db.creditor_entries.toArray(),
        ]);

      // Calculate bank balances
      const bankBalances = banks.map((bank) => {
        const txBankRows = txBanksAll.filter((tb) => tb.bank_id === bank.id);
        const balance = txBankRows.reduce((sum, tb) => {
          const tx = txAll.find((t) => t.id === tb.transaction_id);
          if (!tx) return sum;
          if (tx.type === "sale") return sum + tb.amount;
          return sum - tb.amount;
        }, bank.opening_balance);
        return { ...bank, balance };
      });

      const todayTx = txAll.filter((t) => t.date === todayStr);
      const todaySales = todayTx
        .filter((t) => t.type === "sale")
        .reduce((s, t) => s + t.amount, 0);
      const todayPurchases = todayTx
        .filter((t) => t.type === "purchase")
        .reduce((s, t) => s + t.amount, 0);
      const todayExpenses = todayTx
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);

      // Recent 5 transactions
      const sorted = [...txAll].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const recent = sorted.slice(0, 5).map((tx) => ({
        ...tx,
        transaction_banks: txBanksAll
          .filter((tb) => tb.transaction_id === tx.id)
          .map((tb) => ({
            ...tb,
            bank: banks.find((b) => b.id === tb.bank_id)!,
          })),
      }));

      const totalDebtors = debtorEntries.reduce((sum, e) => {
        return sum + (e.type === "credit_given" ? e.amount : -e.amount);
      }, 0);
      const totalCreditors = creditorEntries.reduce((sum, e) => {
        return sum + (e.type === "credit_taken" ? e.amount : -e.amount);
      }, 0);

      setData({
        banks: bankBalances,
        todaySales,
        todayPurchases,
        todayExpenses,
        recentTransactions: recent,
        totalDebtors,
        totalCreditors,
      });
      setLoading(false);
      refreshSyncCount();
    }
    load();
  }, [todayStr, refreshSyncCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalBalance = data!.banks.reduce((s, b) => s + b.balance, 0);

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
            Roopa&apos;s Craft
          </p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Finance</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatDate(todayStr)}</p>
        </div>
        <SyncBadge />
      </div>

      {/* Total balance card */}
      <div
        className="rounded-2xl p-5 text-white"
        style={{ background: "linear-gradient(135deg, var(--forest-green), var(--forest-green-light))" }}
      >
        <p className="text-xs opacity-75 uppercase tracking-wider font-semibold">Total Balance</p>
        <p className="text-3xl font-bold mt-1">{formatINR(totalBalance)}</p>
        <div className="flex gap-3 mt-4">
          {data!.banks.map((bank) => (
            <div key={bank.id} className="flex-1 bg-white/15 rounded-xl p-3">
              <p className="text-xs opacity-80 truncate">{bank.name}</p>
              <p className="text-sm font-bold mt-0.5">{formatINR(bank.balance)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today summary */}
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-2">
          Today
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/sales" className="card flex flex-col gap-1 active:scale-95 transition-transform">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50">
              <TrendingUp size={16} className="text-[var(--success)]" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Sales</p>
            <p className="text-sm font-bold text-sale">{formatINR(data!.todaySales)}</p>
          </Link>
          <Link href="/purchases" className="card flex flex-col gap-1 active:scale-95 transition-transform">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50">
              <ShoppingBag size={16} className="text-[var(--warning)]" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Purchase</p>
            <p className="text-sm font-bold text-purchase">{formatINR(data!.todayPurchases)}</p>
          </Link>
          <Link href="/expenses" className="card flex flex-col gap-1 active:scale-95 transition-transform">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50">
              <Receipt size={16} className="text-[var(--danger)]" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Expense</p>
            <p className="text-sm font-bold text-expense">{formatINR(data!.todayExpenses)}</p>
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/banks" className="card flex flex-col items-center gap-1.5 py-4 active:scale-95 transition-transform">
          <Landmark size={20} style={{ color: "var(--forest-green)" }} />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Banks</span>
        </Link>
        <Link href="/debtors" className="card flex flex-col items-center gap-1.5 py-4 active:scale-95 transition-transform">
          <Users size={20} style={{ color: "var(--muted-gold)" }} />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Debtors</span>
          {data!.totalDebtors > 0 && (
            <span className="text-xs font-bold text-sale">{formatINR(data!.totalDebtors)}</span>
          )}
        </Link>
        <Link href="/creditors" className="card flex flex-col items-center gap-1.5 py-4 active:scale-95 transition-transform">
          <UserCheck size={20} style={{ color: "var(--danger)" }} />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Creditors</span>
          {data!.totalCreditors > 0 && (
            <span className="text-xs font-bold text-expense">{formatINR(data!.totalCreditors)}</span>
          )}
        </Link>
      </div>

      {/* Recent transactions */}
      {data!.recentTransactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
              Recent
            </p>
            <Link href="/transactions" className="text-xs font-semibold flex items-center gap-0.5" style={{ color: "var(--forest-green)" }}>
              See all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {data!.recentTransactions.map((tx) => (
              <div key={tx.id} className="card flex items-center gap-3 py-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    tx.type === "sale" ? "bg-green-50" : tx.type === "purchase" ? "bg-amber-50" : "bg-red-50"
                  }`}
                >
                  {tx.type === "sale" ? (
                    <TrendingUp size={16} className="text-sale" />
                  ) : tx.type === "purchase" ? (
                    <ShoppingBag size={16} className="text-purchase" />
                  ) : (
                    <Receipt size={16} className="text-expense" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize">
                    {tx.type === "expense" && tx.expense_category
                      ? tx.expense_category
                      : tx.type}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {tx.note || tx.transaction_banks.map((tb) => tb.bank?.name).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.type === "sale" ? "text-sale" : tx.type === "purchase" ? "text-purchase" : "text-expense"}`}>
                    {tx.type === "sale" ? "+" : "-"}{formatINR(tx.amount)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{formatDate(tx.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
