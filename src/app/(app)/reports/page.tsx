"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";
import { shareBill } from "@/lib/bill-generator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { BarChart2, Share2, Store, Landmark, TrendingUp } from "lucide-react";
import type { Transaction, Stall, InvestmentEntry } from "@/lib/types";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const EXPENSE_LABELS: Record<string, string> = {
  stall: "Stall", fuel: "Fuel", food: "Food", travel: "Travel",
  salary: "Salary", helper_salary: "Helper", stall_rent: "Stall Rent", other: "Other",
};
const PIE_COLORS = ["#306D29", "#c8a059", "#dc2626", "#d97706", "#16a34a", "#6b7280", "#8b5cf6", "#ec4899"];

type Tab = "overview" | "stalls" | "banks" | "profit";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [txAll, setTxAll] = useState<Transaction[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [investEntries, setInvestEntries] = useState<InvestmentEntry[]>([]);

  useEffect(() => {
    async function load() {
      const [tx, st, ie] = await Promise.all([
        db.transactions.toArray(),
        db.stalls.toArray(),
        db.investment_entries.toArray(),
      ]);
      setTxAll(tx);
      setStalls(st);
      setInvestEntries(ie);
    }
    load();
  }, []);

  const now = new Date();
  const year = now.getFullYear();

  const filtered = txAll.filter((t) => {
    if (period === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.date) >= weekAgo;
    }
    if (period === "month") {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === now.getMonth();
    }
    return new Date(t.date).getFullYear() === year;
  });

  function shareReport(text: string) {
    shareBill(text);
  }

  return (
    <div className="px-4 pt-6 flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--muted-gold)" }}>
            <BarChart2 size={18} color="white" />
          </div>
          <h1 className="text-xl font-bold">Reports</h1>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex bg-[var(--off-white)] rounded-xl p-1 overflow-x-auto">
        {([
          { key: "overview", label: "Overview" },
          { key: "stalls", label: "Stalls" },
          { key: "banks", label: "Banks" },
          { key: "profit", label: "Profit" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap px-3 ${
              tab === t.key ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex bg-[var(--off-white)] rounded-xl p-1">
        {(["week", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
              period === p ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            {p === "week" ? "This Week" : p === "month" ? "This Month" : "This Year"}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab filtered={filtered} txAll={txAll} year={year} period={period} onShare={shareReport} />}
      {tab === "stalls" && <StallsTab stalls={stalls} txAll={txAll} filtered={filtered} onShare={shareReport} />}
      {tab === "banks" && <BanksTab filtered={filtered} investEntries={investEntries} />}
      {tab === "profit" && <ProfitTab txAll={txAll} year={year} />}
    </div>
  );
}

function OverviewTab({ filtered, txAll, year, period, onShare }: {
  filtered: Transaction[]; txAll: Transaction[]; year: number; period: string;
  onShare: (text: string) => void;
}) {
  const sales = filtered.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0);
  const purchases = filtered.filter((t) => t.type === "purchase").reduce((s, t) => s + t.amount, 0);
  const expenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = sales - purchases - expenses;

  const monthData = MONTHS.map((m, i) => {
    const monthTx = txAll.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === i;
    });
    return {
      month: m,
      sales: monthTx.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0),
      purchases: monthTx.filter((t) => t.type === "purchase").reduce((s, t) => s + t.amount, 0),
      expenses: monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });

  const cats: Record<string, number> = {};
  filtered.filter((t) => t.type === "expense").forEach((t) => {
    const cat = t.expense_category || "other";
    cats[cat] = (cats[cat] || 0) + t.amount;
  });
  const expenseBreakdown = Object.entries(cats).map(([k, v]) => ({
    name: EXPENSE_LABELS[k] || k, value: v,
  }));

  function handleShare() {
    const text = [
      `*Roopa's Craft Jewellery — ${period === "week" ? "Weekly" : period === "month" ? "Monthly" : "Yearly"} Report*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Sales: ${formatINR(sales)}`,
      `Purchases: ${formatINR(purchases)}`,
      `Expenses: ${formatINR(expenses)}`,
      `*Profit: ${formatINR(profit)}*`,
    ].join("\n");
    onShare(text);
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Sales</p>
          <p className="text-lg font-bold text-sale mt-1">{formatINR(sales)}</p>
        </div>
        <div className="card">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Purchases</p>
          <p className="text-lg font-bold text-purchase mt-1">{formatINR(purchases)}</p>
        </div>
        <div className="card">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Expenses</p>
          <p className="text-lg font-bold text-expense mt-1">{formatINR(expenses)}</p>
        </div>
        <div className="card">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Profit</p>
          <p className={`text-lg font-bold mt-1 ${profit >= 0 ? "text-sale" : "text-expense"}`}>
            {formatINR(profit)}
          </p>
        </div>
      </div>

      {/* Share button */}
      <button onClick={handleShare} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)]">
        <Share2 size={14} /> Share Report
      </button>

      {/* Monthly bar chart */}
      <div className="card">
        <p className="text-sm font-bold mb-4">Monthly Overview ({year})</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatINR(Number(v))} />
            <Bar dataKey="sales" fill="#16a34a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="purchases" fill="#d97706" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses" fill="#dc2626" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          {[{ c: "#16a34a", l: "Sales" }, { c: "#d97706", l: "Purchase" }, { c: "#dc2626", l: "Expense" }].map((item) => (
            <div key={item.l} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <div className="w-3 h-3 rounded-sm" style={{ background: item.c }} />
              {item.l}
            </div>
          ))}
        </div>
      </div>

      {/* Expense pie chart */}
      {expenseBreakdown.length > 0 && (
        <div className="card">
          <p className="text-sm font-bold mb-4">Expense Breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {expenseBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatINR(Number(v))} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

function StallsTab({ stalls, txAll, filtered, onShare }: {
  stalls: Stall[]; txAll: Transaction[]; filtered: Transaction[];
  onShare: (text: string) => void;
}) {
  const stallData = stalls
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .map((s) => {
      const stallTx = txAll.filter((t) => t.stall_id === s.id);
      const sales = stallTx.filter((t) => t.type === "sale").reduce((sum, t) => sum + t.amount, 0);
      const expenses = stallTx.filter((t) => t.type === "expense" || t.type === "purchase").reduce((sum, t) => sum + t.amount, 0);
      const profit = sales - expenses - s.stall_rental_fee;
      return { ...s, sales, expenses: expenses + s.stall_rental_fee, profit };
    });

  const totalProfit = stallData.reduce((s, d) => s + d.profit, 0);
  const totalStalls = stallData.length;

  const chartData = stallData.slice(0, 10).map((s) => ({
    name: s.name.length > 8 ? s.name.slice(0, 8) + "…" : s.name,
    profit: s.profit,
  }));

  function handleShare() {
    const lines = [
      `*Roopa's Craft Jewellery — Stall Report*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Total stalls: ${totalStalls}`,
      `Total profit: ${formatINR(totalProfit)}`,
      ``,
      ...stallData.map((s) =>
        `${s.name} (${s.place}): ${formatINR(s.profit)}`
      ),
    ];
    onShare(lines.join("\n"));
  }

  return (
    <>
      {/* Summary */}
      <div className="flex gap-3">
        <div className="flex-1 card text-center py-3">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Total Stalls</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{totalStalls}</p>
        </div>
        <div className="flex-1 card text-center py-3">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Total Profit</p>
          <p className="text-xl font-bold" style={{ color: totalProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
            {formatINR(totalProfit)}
          </p>
        </div>
      </div>

      <button onClick={handleShare} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)]">
        <Share2 size={14} /> Share Stall Report
      </button>

      {/* Profit chart */}
      {chartData.length > 0 && (
        <div className="card">
          <p className="text-sm font-bold mb-4">Stall Profits</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatINR(Number(v))} />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.profit >= 0 ? "#16a34a" : "#dc2626"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stall table */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--off-white)] rounded-lg text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
          <span className="flex-1">Stall</span>
          <span className="w-16 text-right">Sales</span>
          <span className="w-16 text-right">Expense</span>
          <span className="w-16 text-right">Profit</span>
        </div>
        {stallData.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-8 text-center">No stalls yet.</p>
        ) : (
          stallData.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] last:border-0">
              <div className="flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{s.name}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{s.place}</p>
              </div>
              <span className="w-16 text-right text-xs font-medium text-[var(--success)]">
                {formatINR(s.sales)}
              </span>
              <span className="w-16 text-right text-xs font-medium text-[var(--danger)]">
                {formatINR(s.expenses)}
              </span>
              <span className="w-16 text-right text-xs font-bold" style={{ color: s.profit >= 0 ? "var(--success)" : "var(--danger)" }}>
                {formatINR(s.profit)}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function BanksTab({ filtered, investEntries }: {
  filtered: Transaction[]; investEntries: InvestmentEntry[];
}) {
  const [banks, setBanks] = useState<{ id: string; name: string; type: string; receipts: number; payments: number }[]>([]);

  useEffect(() => {
    async function load() {
      const [allBanks, txBanks] = await Promise.all([
        db.banks.toArray(),
        db.transaction_banks.toArray(),
      ]);

      const filteredIds = new Set(filtered.map((t) => t.id));

      const bankData = allBanks.map((bank) => {
        const relevantTxBanks = txBanks.filter(
          (tb) => tb.bank_id === bank.id && filteredIds.has(tb.transaction_id)
        );

        let receipts = 0;
        let payments = 0;

        for (const tb of relevantTxBanks) {
          const tx = filtered.find((t) => t.id === tb.transaction_id);
          if (!tx) continue;
          if (tx.type === "sale") receipts += tb.amount;
          else payments += tb.amount;
        }

        const bankInvest = investEntries.filter((ie) => ie.bank_id === bank.id);
        for (const ie of bankInvest) {
          if (ie.type === "invest") payments += ie.amount;
          else receipts += ie.amount;
        }

        return { id: bank.id, name: bank.name, type: bank.type, receipts, payments };
      });

      setBanks(bankData);
    }
    load();
  }, [filtered, investEntries]);

  const totalReceipts = banks.reduce((s, b) => s + b.receipts, 0);
  const totalPayments = banks.reduce((s, b) => s + b.payments, 0);

  return (
    <>
      {/* Summary */}
      <div className="flex gap-3">
        <div className="flex-1 card text-center py-3">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Total Receipts</p>
          <p className="text-lg font-bold text-[var(--success)]">{formatINR(totalReceipts)}</p>
        </div>
        <div className="flex-1 card text-center py-3">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Total Payments</p>
          <p className="text-lg font-bold text-[var(--danger)]">{formatINR(totalPayments)}</p>
        </div>
      </div>

      {/* Per-bank breakdown */}
      <div className="flex flex-col gap-2">
        {banks.map((bank) => (
          <div key={bank.id} className="card">
            <div className="flex items-center gap-2 mb-2">
              <Landmark size={14} style={{ color: "var(--forest-green)" }} />
              <p className="text-sm font-bold text-[var(--text-primary)]">{bank.name}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--off-white)] text-[var(--text-secondary)] capitalize">
                {bank.type}
              </span>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase">Receipts</p>
                <p className="text-sm font-bold text-[var(--success)]">{formatINR(bank.receipts)}</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase">Payments</p>
                <p className="text-sm font-bold text-[var(--danger)]">{formatINR(bank.payments)}</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase">Net</p>
                <p className="text-sm font-bold" style={{ color: bank.receipts - bank.payments >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {formatINR(bank.receipts - bank.payments)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banks.length === 0 && (
        <p className="text-xs text-[var(--text-secondary)] py-8 text-center">No bank data yet.</p>
      )}
    </>
  );
}

function ProfitTab({ txAll, year }: { txAll: Transaction[]; year: number }) {
  const monthlyProfit = MONTHS.map((m, i) => {
    const monthTx = txAll.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === i;
    });
    const sales = monthTx.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0);
    const costs = monthTx.filter((t) => t.type !== "sale").reduce((s, t) => s + t.amount, 0);
    return { month: m, profit: sales - costs, sales, costs };
  });

  const yearProfit = monthlyProfit.reduce((s, m) => s + m.profit, 0);
  const yearSales = monthlyProfit.reduce((s, m) => s + m.sales, 0);
  const bestMonth = [...monthlyProfit].sort((a, b) => b.profit - a.profit)[0];
  const currentMonth = monthlyProfit[new Date().getMonth()];

  return (
    <>
      {/* Year summary */}
      <div className="flex gap-3">
        <div className="flex-1 card text-center py-3">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">Year Profit</p>
          <p className="text-lg font-bold" style={{ color: yearProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
            {formatINR(yearProfit)}
          </p>
        </div>
        <div className="flex-1 card text-center py-3">
          <p className="text-[10px] text-[var(--text-secondary)] uppercase">This Month</p>
          <p className="text-lg font-bold" style={{ color: currentMonth.profit >= 0 ? "var(--success)" : "var(--danger)" }}>
            {formatINR(currentMonth.profit)}
          </p>
        </div>
      </div>

      {/* Best month */}
      {bestMonth && bestMonth.profit > 0 && (
        <div className="card flex items-center gap-3 py-3">
          <TrendingUp size={18} className="text-[var(--success)]" />
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Best Month</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {bestMonth.month} — {formatINR(bestMonth.profit)}
            </p>
          </div>
        </div>
      )}

      {/* Profit trend line chart */}
      <div className="card">
        <p className="text-sm font-bold mb-4">Monthly Profit Trend ({year})</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyProfit} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatINR(Number(v))} />
            <Line type="monotone" dataKey="profit" stroke="#306D29" strokeWidth={2.5} dot={{ r: 4, fill: "#306D29" }} />
            <Line type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <div className="w-3 h-0.5 rounded" style={{ background: "#306D29" }} />
            Profit
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <div className="w-3 h-0.5 rounded" style={{ background: "#16a34a", borderTop: "1px dashed #16a34a" }} />
            Sales
          </div>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--off-white)] rounded-lg text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
          <span className="w-10">Month</span>
          <span className="flex-1 text-right">Sales</span>
          <span className="flex-1 text-right">Costs</span>
          <span className="flex-1 text-right">Profit</span>
        </div>
        {monthlyProfit.map((m) => (
          <div key={m.month} className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] last:border-0">
            <span className="w-10 text-xs font-medium text-[var(--text-primary)]">{m.month}</span>
            <span className="flex-1 text-right text-xs text-[var(--success)]">{formatINR(m.sales)}</span>
            <span className="flex-1 text-right text-xs text-[var(--danger)]">{formatINR(m.costs)}</span>
            <span className="flex-1 text-right text-xs font-bold" style={{ color: m.profit >= 0 ? "var(--success)" : "var(--danger)" }}>
              {formatINR(m.profit)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
