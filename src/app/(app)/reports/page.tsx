"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
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
} from "recharts";
import { BarChart2 } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EXPENSE_LABELS: Record<string, string> = {
  stall: "Stall",
  fuel: "Fuel",
  food: "Food",
  travel: "Travel",
  salary: "Salary",
  other: "Other",
};

const PIE_COLORS = ["#4f6228", "#c8a059", "#dc2626", "#d97706", "#16a34a", "#6b7280"];

export default function ReportsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [monthData, setMonthData] = useState<{ month: string; sales: number; purchases: number; expenses: number }[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [summary, setSummary] = useState({ sales: 0, purchases: 0, expenses: 0, profit: 0 });

  useEffect(() => {
    async function load() {
      const txAll = await db.transactions.toArray();
      const now = new Date();
      const year = now.getFullYear();

      // Monthly data for current year
      const monthly = MONTHS.map((m, i) => {
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
      setMonthData(monthly);

      // Filter by period for summary
      let filtered = txAll;
      if (period === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = txAll.filter((t) => new Date(t.date) >= weekAgo);
      } else if (period === "month") {
        filtered = txAll.filter((t) => {
          const d = new Date(t.date);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
      } else {
        filtered = txAll.filter((t) => new Date(t.date).getFullYear() === year);
      }

      const sales = filtered.filter((t) => t.type === "sale").reduce((s, t) => s + t.amount, 0);
      const purchases = filtered.filter((t) => t.type === "purchase").reduce((s, t) => s + t.amount, 0);
      const expenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      setSummary({ sales, purchases, expenses, profit: sales - purchases - expenses });

      // Expense breakdown
      const cats: Record<string, number> = {};
      filtered.filter((t) => t.type === "expense").forEach((t) => {
        const cat = t.expense_category || "other";
        cats[cat] = (cats[cat] || 0) + t.amount;
      });
      setExpenseBreakdown(
        Object.entries(cats).map(([k, v]) => ({ name: EXPENSE_LABELS[k] || k, value: v }))
      );
    }
    load();
  }, [period]);

  return (
    <div className="px-4 pt-6 flex flex-col gap-5 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--muted-gold)" }}>
          <BarChart2 size={18} color="white" />
        </div>
        <h1 className="text-xl font-bold">Reports</h1>
      </div>

      {/* Period selector */}
      <div className="flex bg-[var(--off-white)] rounded-xl p-1">
        {(["week", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              period === p ? "bg-white text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            {p === "week" ? "This Week" : p === "month" ? "This Month" : "This Year"}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Sales</p>
          <p className="text-lg font-bold text-sale mt-1">{formatINR(summary.sales)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Purchases</p>
          <p className="text-lg font-bold text-purchase mt-1">{formatINR(summary.purchases)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Expenses</p>
          <p className="text-lg font-bold text-expense mt-1">{formatINR(summary.expenses)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Profit</p>
          <p className={`text-lg font-bold mt-1 ${summary.profit >= 0 ? "text-sale" : "text-expense"}`}>
            {formatINR(summary.profit)}
          </p>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="card">
        <p className="text-sm font-bold mb-4">Monthly Overview ({new Date().getFullYear()})</p>
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
              <Pie
                data={expenseBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
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
    </div>
  );
}
