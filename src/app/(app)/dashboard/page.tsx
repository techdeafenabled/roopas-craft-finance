"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { formatINR, formatDate, today } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Receipt,
  Eye,
  EyeOff,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Store,
  MapPin,
} from "lucide-react";
import type { Bank, TransactionWithBanks, Debtor, Stall, Transaction } from "@/lib/types";

const HIDE_KEY = "rcj_hide_amounts";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface StallSummary {
  id: string;
  name: string;
  place: string;
  profit: number;
  status: string;
}

interface DashboardData {
  banks: (Bank & { balance: number })[];
  monthSales: number;
  monthExpenses: number;
  monthProfit: number;
  lastMonthProfit: number;
  monthlyChart: { month: string; sales: number; expenses: number }[];
  recentTransactions: TransactionWithBanks[];
  totalDebtors: number;
  totalCreditors: number;
  totalInvestments: number;
  duesSoon: { debtor: Debtor; balance: number }[];
  maxDue: number;
  activeStall: StallSummary | null;
  recentStalls: StallSummary[];
  stallCountThisYear: number;
}

function masked(val: number, hidden: boolean) {
  return hidden ? "••••••" : formatINR(val);
}

export default function DashboardPage() {
  const { refreshSyncCount } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [hiddenBanks, setHiddenBanks] = useState<Record<string, boolean>>({});
  const [banksExpanded, setBanksExpanded] = useState(false);
  const todayStr = today();

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
    const [banks, txAll, txBanksAll, debtorEntries, debtors, investmentEntries, stalls] =
      await Promise.all([
        db.banks.toArray(),
        db.transactions.toArray(),
        db.transaction_banks.toArray(),
        db.debtor_entries.toArray(),
        db.debtors.toArray(),
        db.investment_entries.toArray(),
        db.stalls.toArray(),
      ]);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Bank balances
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

    // This month
    const thisMonthTx = txAll.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const lastMonthTx = txAll.filter((t) => {
      const d = new Date(t.date);
      const lm = month === 0 ? 11 : month - 1;
      const ly = month === 0 ? year - 1 : year;
      return d.getFullYear() === ly && d.getMonth() === lm;
    });

    const monthSales = thisMonthTx.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0);
    const monthExpenses = thisMonthTx.filter((t) => t.type !== "sale").reduce((s, t) => s + t.amount, 0);
    const monthProfit = monthSales - monthExpenses;
    const lastMonthSales = lastMonthTx.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0);
    const lastMonthExpenses = lastMonthTx.filter((t) => t.type !== "sale").reduce((s, t) => s + t.amount, 0);
    const lastMonthProfit = lastMonthSales - lastMonthExpenses;

    // Monthly chart
    const monthlyChart = MONTHS.map((m, i) => {
      const mTx = txAll.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === i;
      });
      return {
        month: m,
        sales: mTx.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0),
        expenses: mTx.filter((t) => t.type !== "sale").reduce((s, t) => s + t.amount, 0),
      };
    });

    // Recent transactions
    const sorted = [...txAll].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const recent = sorted.slice(0, 5).map((tx) => ({
      ...tx,
      transaction_banks: txBanksAll
        .filter((tb) => tb.transaction_id === tx.id)
        .map((tb) => ({ ...tb, bank: banks.find((b) => b.id === tb.bank_id)! })),
    }));

    // Debtors
    const totalDebtors = debtorEntries.reduce(
      (s, e) => s + (e.type === "credit_given" ? e.amount : -e.amount), 0
    );
    const totalCreditors = debtorEntries.length > 0
      ? (await db.creditor_entries.toArray()).reduce(
          (s, e) => s + (e.type === "credit_taken" ? e.amount : -e.amount), 0
        )
      : 0;

    const debtorBalances = debtors.map((d) => {
      const entries = debtorEntries.filter((e) => e.debtor_id === d.id);
      const balance = entries.reduce(
        (s, e) => s + (e.type === "credit_given" ? e.amount : -e.amount), 0
      );
      return { debtor: d, balance };
    }).filter((d) => d.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 4);

    const maxDue = Math.max(...debtorBalances.map((d) => d.balance), 1);

    // Investments
    const totalInvestments = investmentEntries.reduce(
      (s, e) => s + (e.type === "invest" ? e.amount : -e.amount), 0
    );

    // Stalls
    function getStallProfit(stall: Stall): number {
      const stallTx = txAll.filter((t) => t.stall_id === stall.id);
      const sales = stallTx.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0);
      const expenses = stallTx.filter((t) => t.type !== "sale").reduce((s, t) => s + t.amount, 0);
      return sales - expenses - stall.stall_rental_fee;
    }

    const activeStallRaw = stalls.find((s) => s.status === "active") || null;
    const activeStall: StallSummary | null = activeStallRaw
      ? { id: activeStallRaw.id, name: activeStallRaw.name, place: activeStallRaw.place, profit: getStallProfit(activeStallRaw), status: "active" }
      : null;

    const recentStalls: StallSummary[] = stalls
      .filter((s) => s.status === "completed")
      .sort((a, b) => (b.end_date || b.start_date).localeCompare(a.end_date || a.start_date))
      .slice(0, 3)
      .map((s) => ({ id: s.id, name: s.name, place: s.place, profit: getStallProfit(s), status: "completed" }));

    const stallCountThisYear = stalls.filter((s) => {
      return new Date(s.start_date).getFullYear() === year;
    }).length;

    setData({
      banks: bankBalances,
      monthSales, monthExpenses, monthProfit, lastMonthProfit,
      monthlyChart, recentTransactions: recent,
      totalDebtors, totalCreditors, totalInvestments,
      duesSoon: debtorBalances, maxDue,
      activeStall, recentStalls, stallCountThisYear,
    });
    setLoading(false);
    refreshSyncCount();
  }, [todayStr, refreshSyncCount]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalBalance = data.banks.reduce((s, b) => s + b.balance, 0);

  // Profit % change
  let profitChangeText = "";
  let profitChangePositive = true;
  if (data.lastMonthProfit === 0 && data.monthProfit === 0) {
    profitChangeText = "";
  } else if (data.lastMonthProfit === 0) {
    profitChangeText = "+100%";
  } else {
    const pct = ((data.monthProfit - data.lastMonthProfit) / Math.abs(data.lastMonthProfit)) * 100;
    profitChangePositive = pct >= 0;
    profitChangeText = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  }

  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="px-4 pt-5 pb-4 flex flex-col gap-5">

      {/* ── 1. HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Overview</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{todayDate}</p>
        </div>
        <Link
          href="/sales"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: "#0D530E" }}
        >
          <Plus size={16} /> Add Transaction
        </Link>
      </div>

      {/* ── 2. THREE KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Total Balance */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
              Total Balance
            </p>
            <button onClick={toggleHide} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--off-white)]">
              {hidden ? <EyeOff size={13} className="text-[var(--text-secondary)]" /> : <Eye size={13} className="text-[var(--text-secondary)]" />}
            </button>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{masked(totalBalance, hidden)}</p>
          {data.totalInvestments > 0 && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              +{masked(data.totalInvestments, hidden)} invested
            </p>
          )}
          <button onClick={() => setBanksExpanded(!banksExpanded)} className="flex items-center gap-1 text-[10px] font-semibold mt-2" style={{ color: "#306D29" }}>
            {banksExpanded ? "Hide" : "Show"} banks
            {banksExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {banksExpanded && (
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-1.5">
              {data.banks.map((bank) => {
                const bh = hidden || !!hiddenBanks[bank.id];
                return (
                  <div key={bank.id} className="flex items-center gap-1.5 text-xs">
                    <span className="flex-1 text-[var(--text-secondary)]">{bank.name}</span>
                    <span className={`font-semibold ${bank.balance < 0 ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
                      {bh ? "••••" : formatINR(bank.balance)}
                    </span>
                    <button onClick={() => toggleBankHide(bank.id)} className="w-5 h-5 flex items-center justify-center">
                      {bh ? <EyeOff size={10} className="text-[var(--text-secondary)]" /> : <Eye size={10} className="text-[var(--text-secondary)]" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* This Month's Profit */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
              This Month Profit
            </p>
            {profitChangeText && (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${profitChangePositive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                {profitChangePositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {profitChangeText}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold" style={{ color: data.monthProfit >= 0 ? "#306D29" : "#dc2626" }}>
            {masked(data.monthProfit, hidden)}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {masked(data.monthSales, hidden)} sales · {masked(data.monthExpenses, hidden)} costs
          </p>
        </div>

        {/* Outstanding Dues */}
        <Link href="/debtors" className="card hover:shadow-md transition-shadow">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-1">
            Outstanding Dues
          </p>
          <p className="text-2xl font-bold" style={{ color: "#d97706" }}>
            {masked(data.totalDebtors, hidden)}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {data.duesSoon.length} people owe you
          </p>
        </Link>
      </div>

      {/* ── 3. SALES VS EXPENSES CHART ── */}
      <div className="card">
        <p className="text-sm font-bold text-[var(--text-primary)] mb-4">
          Sales vs Expenses — {new Date().getFullYear()}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.monthlyChart} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatINR(Number(v))} />
            <Bar dataKey="sales" fill="#306D29" radius={[4, 4, 0, 0]} name="Sales" />
            <Bar dataKey="expenses" fill="#E7E1B1" radius={[4, 4, 0, 0]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#306D29" }} /> Sales
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#E7E1B1" }} /> Expenses
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">
            This month: <span className="font-semibold text-[var(--success)]">{masked(data.monthSales, hidden)}</span>
            {" · "}
            <span className="font-semibold text-[var(--danger)]">{masked(data.monthExpenses, hidden)}</span>
          </p>
        </div>
      </div>

      {/* ── 4. TWO PANELS: DEBTS + STALLS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: Debt Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">You&apos;re Owed</p>
              <p className="text-lg font-bold" style={{ color: "#d97706" }}>{masked(data.totalDebtors, hidden)}</p>
            </div>
            <Link href="/debtors" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: "#306D29" }}>
              View all <ArrowRight size={10} />
            </Link>
          </div>

          {data.duesSoon.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] py-6 text-center">No outstanding dues</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.duesSoon.map(({ debtor, balance }) => {
                const pct = Math.min((balance / data.maxDue) * 100, 100);
                return (
                  <Link href="/debtors" key={debtor.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{debtor.name}</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{masked(balance, hidden)}</span>
                    </div>
                    <div className="w-full bg-[var(--off-white)] rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#d97706" }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {data.totalCreditors > 0 && (
            <Link href="/creditors" className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--text-secondary)]">You owe</span>
              <span className="text-xs font-bold text-[var(--danger)]">{masked(data.totalCreditors, hidden)}</span>
            </Link>
          )}
        </div>

        {/* Right: Stall Performance */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Stalls</p>
              <p className="text-xs text-[var(--text-secondary)]">{data.stallCountThisYear} this year</p>
            </div>
            <Link href="/stalls" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: "#306D29" }}>
              View all <ArrowRight size={10} />
            </Link>
          </div>

          {/* Active stall */}
          {data.activeStall && (
            <Link href={`/stalls/${data.activeStall.id}`} className="flex items-center gap-2.5 p-2.5 rounded-xl mb-3" style={{ background: "rgba(48,109,41,0.08)", border: "1px solid rgba(48,109,41,0.15)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#306D29" }}>
                <Store size={14} color="white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ background: "#306D29", color: "white" }}>Active</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{data.activeStall.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={9} className="text-[var(--text-secondary)]" />
                  <span className="text-[10px] text-[var(--text-secondary)]">{data.activeStall.place}</span>
                </div>
              </div>
              <p className="text-sm font-bold" style={{ color: data.activeStall.profit >= 0 ? "#306D29" : "#dc2626" }}>
                {masked(data.activeStall.profit, hidden)}
              </p>
            </Link>
          )}

          {/* Recent completed stalls */}
          {data.recentStalls.length > 0 ? (
            <div className="flex flex-col gap-0">
              {data.recentStalls.map((stall) => (
                <Link href={`/stalls/${stall.id}`} key={stall.id} className="flex items-center gap-2.5 py-2.5 border-b border-[var(--border)] last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--off-white)] flex items-center justify-center">
                    <Store size={12} className="text-[var(--text-secondary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{stall.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{stall.place}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: stall.profit >= 0 ? "#306D29" : "#dc2626" }}>
                    {masked(stall.profit, hidden)}
                  </p>
                </Link>
              ))}
            </div>
          ) : !data.activeStall ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Store size={24} className="text-[var(--border)]" />
              <p className="text-xs text-[var(--text-secondary)]">No stalls yet</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── 5. RECENT TRANSACTIONS ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-[var(--text-primary)]">Recent Transactions</p>
          <Link href="/transactions" className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text-secondary)]">
            View All
          </Link>
        </div>
        {data.recentTransactions.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-8 text-center">No transactions yet</p>
        ) : (
          <div className="flex flex-col">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  tx.type === "sale" ? "bg-green-50" : tx.type === "purchase" ? "bg-amber-50" : "bg-red-50"
                }`}>
                  {tx.type === "sale" ? <TrendingUp size={15} style={{ color: "#306D29" }} /> :
                   tx.type === "purchase" ? <ShoppingBag size={15} className="text-[var(--warning)]" /> :
                   <Receipt size={15} className="text-[var(--danger)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize truncate">
                    {tx.note || (tx.type === "expense" && tx.expense_category ? tx.expense_category.replace("_", " ") : tx.type)}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{formatDate(tx.date)}</p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${tx.type === "sale" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                  {tx.type === "sale" ? "+" : "−"}{masked(tx.amount, hidden)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
