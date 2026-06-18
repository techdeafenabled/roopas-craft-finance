"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { formatINR, formatDate, today } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import SyncBadge from "@/components/SyncBadge";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Users,
  UserCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Plus,
  List,
  BarChart2,
} from "lucide-react";
import type { Bank, TransactionWithBanks, DebtorEntry, Debtor } from "@/lib/types";

const HIDE_KEY = "rcj_hide_amounts";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DashboardData {
  banks: (Bank & { balance: number })[];
  todaySales: number;
  todayPurchases: number;
  todayExpenses: number;
  weekSales: { day: string; amount: number; date: string }[];
  recentTransactions: TransactionWithBanks[];
  totalDebtors: number;
  totalCreditors: number;
  totalInvestments: number;
  duesSoon: { debtor: Debtor; balance: number; oldestDate: string }[];
}

function masked(val: number, hidden: boolean) {
  if (hidden) return "••••••";
  return formatINR(val);
}

export default function DashboardPage() {
  const { refreshSyncCount } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [hiddenBanks, setHiddenBanks] = useState<Record<string, boolean>>({});
  const todayStr = today();

  // Persist hide state
  useEffect(() => {
    setHidden(localStorage.getItem(HIDE_KEY) === "1");
    try {
      const saved = localStorage.getItem(HIDE_KEY + "_banks");
      if (saved) setHiddenBanks(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  function toggleHide() {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem(HIDE_KEY, next ? "1" : "0");
  }

  function toggleBankHide(id: string) {
    setHiddenBanks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(HIDE_KEY + "_banks", JSON.stringify(next));
      return next;
    });
  }

  const load = useCallback(async () => {
    const [banks, txAll, txBanksAll, debtorEntries, creditorEntries, debtors, investmentEntries] =
      await Promise.all([
        db.banks.toArray(),
        db.transactions.toArray(),
        db.transaction_banks.toArray(),
        db.debtor_entries.toArray(),
        db.creditor_entries.toArray(),
        db.debtors.toArray(),
        db.investment_entries.toArray(),
      ]);

    // Bank balances (including investment impact)
    const bankBalances = banks.map((bank) => {
      const relevant = txBanksAll.filter((tb) => tb.bank_id === bank.id);
      let balance = relevant.reduce((sum, tb) => {
        const tx = txAll.find((t) => t.id === tb.transaction_id);
        if (!tx) return sum;
        return sum + (tx.type === "sale" ? tb.amount : -tb.amount);
      }, bank.opening_balance);
      const investAdjust = investmentEntries
        .filter((ie) => ie.bank_id === bank.id)
        .reduce((sum, ie) => sum + (ie.type === "withdraw" ? ie.amount : -ie.amount), 0);
      balance += investAdjust;
      return { ...bank, balance };
    });

    // Today
    const todayTx = txAll.filter((t) => t.date === todayStr);
    const todaySales = todayTx.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0);
    const todayPurchases = todayTx.filter((t) => t.type === "purchase").reduce((s, t) => s + t.amount, 0);
    const todayExpenses = todayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // Last 7 days sales
    const weekSales = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const amount = txAll
        .filter((t) => t.type === "sale" && t.date === dateStr)
        .reduce((s, t) => s + t.amount, 0);
      return { day: DAYS[d.getDay()], amount, date: dateStr };
    });

    // Recent 5 transactions
    const sorted = [...txAll].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const recent = sorted.slice(0, 5).map((tx) => ({
      ...tx,
      transaction_banks: txBanksAll
        .filter((tb) => tb.transaction_id === tx.id)
        .map((tb) => ({ ...tb, bank: banks.find((b) => b.id === tb.bank_id)! })),
    }));

    // Debtors/Creditors totals
    const totalDebtors = debtorEntries.reduce(
      (s, e) => s + (e.type === "credit_given" ? e.amount : -e.amount), 0
    );
    const totalCreditors = creditorEntries.reduce(
      (s, e) => s + (e.type === "credit_taken" ? e.amount : -e.amount), 0
    );

    // Dues soon: top 3 debtors with outstanding balance, oldest first
    const duesSoon = debtors
      .map((d) => {
        const entries = debtorEntries.filter((e) => e.debtor_id === d.id);
        const balance = entries.reduce(
          (s, e) => s + (e.type === "credit_given" ? e.amount : -e.amount), 0
        );
        const creditEntries = entries.filter((e) => e.type === "credit_given");
        const oldestDate = creditEntries.length
          ? creditEntries.sort((a, b) => a.date.localeCompare(b.date))[0].date
          : "";
        return { debtor: d, balance, oldestDate };
      })
      .filter((d) => d.balance > 0)
      .sort((a, b) => a.oldestDate.localeCompare(b.oldestDate))
      .slice(0, 3);

    const totalInvestments = investmentEntries.reduce(
      (s, e) => s + (e.type === "invest" ? e.amount : -e.amount), 0
    );

    setData({
      banks: bankBalances,
      todaySales,
      todayPurchases,
      todayExpenses,
      weekSales,
      recentTransactions: recent,
      totalDebtors,
      totalCreditors,
      totalInvestments,
      duesSoon,
    });
    setLoading(false);
    refreshSyncCount();
  }, [todayStr, refreshSyncCount]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalBalance = data!.banks.reduce((s, b) => s + b.balance, 0);
  const maxWeekSale = Math.max(...data!.weekSales.map((w) => w.amount), 1);

  return (
    <div className="px-4 pt-5 pb-4 flex flex-col gap-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Logo" width={36} height={36} className="rounded-lg object-contain bg-white p-0.5" />
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold leading-none">
              Roopa&apos;s Craft
            </p>
            <p className="text-base font-bold text-[var(--text-primary)] leading-tight">Finance</p>
          </div>
        </div>
        <SyncBadge />
      </div>

      {/* ── TOTAL BALANCE CARD ── */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #5A7D60, var(--forest-green) 60%, var(--forest-green-light))" }}
      >
        {/* decorative circle */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full bg-white/5" />

        {/* Total */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-70 font-semibold">Total Balance</p>
            <p className="text-[2rem] font-bold mt-0.5 leading-tight">
              {hidden ? "••••••" : formatINR(totalBalance)}
            </p>
            {data!.totalInvestments > 0 && (
              <p className="text-[10px] opacity-60 mt-1">
                + {hidden ? "••••" : formatINR(data!.totalInvestments)} invested = {hidden ? "••••••" : formatINR(totalBalance + data!.totalInvestments)} total worth
              </p>
            )}
            <p className="text-xs opacity-60 mt-0.5">{formatDate(todayStr)}</p>
          </div>
          <button
            onClick={toggleHide}
            className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mt-1"
          >
            {hidden ? <EyeOff size={15} color="white" /> : <Eye size={15} color="white" />}
          </button>
        </div>

        {/* Bank list inside card */}
        {data!.banks.length > 0 && (
          <div className="mt-4 border-t border-white/15 pt-3 flex flex-col gap-2.5">
            {data!.banks.map((bank) => {
              const bankHidden = hidden || !!hiddenBanks[bank.id];
              return (
                <div key={bank.id} className="flex items-center gap-2">
                  <span className="text-sm opacity-80 font-medium flex-1">{bank.name}</span>
                  <span className={`text-sm font-bold ${bank.balance < 0 ? "text-red-300" : "text-white"}`}>
                    {bankHidden ? "••••••" : formatINR(bank.balance)}
                  </span>
                  <button
                    onClick={() => toggleBankHide(bank.id)}
                    className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0"
                  >
                    {bankHidden
                      ? <EyeOff size={13} color="white" />
                      : <Eye size={13} color="white" />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── QUICK SHORTCUTS ── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[var(--text-secondary)] mb-2">
          Quick Add
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/sales"
            className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-green-50 border border-green-100 active:scale-95 transition-transform">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <Plus size={16} className="text-[var(--success)]" />
            </div>
            <span className="text-xs font-bold text-[var(--success)]">Sale</span>
          </Link>
          <Link href="/debtors"
            className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-amber-50 border border-amber-100 active:scale-95 transition-transform">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users size={16} className="text-[var(--warning)]" />
            </div>
            <span className="text-xs font-bold text-[var(--warning)]">Debtors</span>
          </Link>
          <Link href="/creditors"
            className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-red-50 border border-red-100 active:scale-95 transition-transform">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <UserCheck size={16} className="text-[var(--danger)]" />
            </div>
            <span className="text-xs font-bold text-[var(--danger)]">Creditors</span>
          </Link>
        </div>

        {/* Secondary shortcuts */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            { href: "/purchases", icon: ShoppingBag, label: "Purchase", color: "var(--warning)" },
            { href: "/expenses", icon: Receipt, label: "Expense", color: "var(--danger)" },
            { href: "/transactions", icon: List, label: "History", color: "var(--forest-green)" },
            { href: "/reports", icon: BarChart2, label: "Reports", color: "var(--forest-green)" },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}
              className="card flex flex-col items-center gap-1 py-3 active:scale-95 transition-transform">
              <Icon size={18} style={{ color }} />
              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── TODAY SUMMARY ── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[var(--text-secondary)] mb-2">
          Today
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="card flex flex-col gap-1">
            <TrendingUp size={15} className="text-[var(--success)]" />
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Sales</p>
            <p className="text-sm font-bold text-sale">{masked(data!.todaySales, hidden)}</p>
          </div>
          <div className="card flex flex-col gap-1">
            <ShoppingBag size={15} className="text-[var(--warning)]" />
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Purchase</p>
            <p className="text-sm font-bold text-purchase">{masked(data!.todayPurchases, hidden)}</p>
          </div>
          <div className="card flex flex-col gap-1">
            <Receipt size={15} className="text-[var(--danger)]" />
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Expense</p>
            <p className="text-sm font-bold text-expense">{masked(data!.todayExpenses, hidden)}</p>
          </div>
        </div>
      </div>

      {/* ── WEEK SALES ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-[var(--text-primary)]">Sales — Last 7 Days</p>
          <Link href="/reports" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: "var(--forest-green)" }}>
            Full report <ArrowRight size={10} />
          </Link>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {data!.weekSales.map((w, i) => {
            const pct = w.amount > 0 ? Math.max((w.amount / maxWeekSale) * 100, 8) : 4;
            const isToday = w.date === todayStr;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${pct}%`,
                      background: isToday ? "var(--forest-green)" : "var(--off-white)",
                      border: isToday ? "none" : "1px solid var(--border)",
                    }}
                  />
                </div>
                <span className={`text-[9px] font-semibold ${isToday ? "text-[var(--forest-green)]" : "text-[var(--text-secondary)]"}`}>
                  {w.day}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-[var(--text-secondary)]">
            Week total: <span className="font-bold text-sale">{masked(data!.weekSales.reduce((s, w) => s + w.amount, 0), hidden)}</span>
          </span>
        </div>
      </div>

      {/* ── DUES SOON ── */}
      {data!.duesSoon.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[var(--text-secondary)]">
              Dues — Oldest First
            </p>
            <Link href="/debtors" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: "var(--forest-green)" }}>
              All debtors <ArrowRight size={10} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {data!.duesSoon.map(({ debtor, balance, oldestDate }) => (
              <Link href="/debtors" key={debtor.id} className="card flex items-center gap-3 py-3 active:scale-[0.99] transition-transform">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-sm font-bold" style={{ color: "var(--muted-gold)" }}>
                  {debtor.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{debtor.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Since {formatDate(oldestDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--warning)]">{masked(balance, hidden)}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">owes you</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── DEBTORS / CREDITORS TOTALS ── */}
      {(data!.totalDebtors > 0 || data!.totalCreditors > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {data!.totalDebtors > 0 && (
            <Link href="/debtors" className="card flex flex-col gap-1 active:scale-95 transition-transform">
              <Users size={16} style={{ color: "var(--muted-gold)" }} />
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">Total Receivable</p>
              <p className="text-sm font-bold text-sale">{masked(data!.totalDebtors, hidden)}</p>
            </Link>
          )}
          {data!.totalCreditors > 0 && (
            <Link href="/creditors" className="card flex flex-col gap-1 active:scale-95 transition-transform">
              <UserCheck size={16} className="text-expense" />
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">Total Payable</p>
              <p className="text-sm font-bold text-expense">{masked(data!.totalCreditors, hidden)}</p>
            </Link>
          )}
        </div>
      )}

      {/* ── RECENT TRANSACTIONS ── */}
      {data!.recentTransactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[var(--text-secondary)]">
              Recent
            </p>
            <Link href="/transactions" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: "var(--forest-green)" }}>
              See all <ArrowRight size={10} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {data!.recentTransactions.map((tx) => (
              <div key={tx.id} className="card flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === "sale" ? "bg-green-50" : tx.type === "purchase" ? "bg-amber-50" : "bg-red-50"}`}>
                  {tx.type === "sale" ? <TrendingUp size={15} className="text-sale" /> : tx.type === "purchase" ? <ShoppingBag size={15} className="text-purchase" /> : <Receipt size={15} className="text-expense" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize">
                    {tx.type === "expense" && tx.expense_category ? tx.expense_category : tx.type}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    {tx.note || tx.transaction_banks.map((tb) => tb.bank?.name).join(" + ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${tx.type === "sale" ? "text-sale" : tx.type === "purchase" ? "text-purchase" : "text-expense"}`}>
                    {tx.type === "sale" ? "+" : "-"}{masked(tx.amount, hidden)}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{formatDate(tx.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
