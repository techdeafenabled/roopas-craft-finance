"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";
import type { Bank, Transaction, TransactionBank, DebtorEntry, CreditorEntry, InvestmentEntry, Debtor, Creditor, Investment } from "@/lib/types";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

interface PassbookEntry {
  id: string;
  date: string;
  description: string;
  type: "in" | "out";
  amount: number;
  runningBalance: number;
  created_at: string;
}

export default function BankPassbookPage() {
  const params = useParams();
  const router = useRouter();
  const bankId = params.id as string;

  const [bank, setBank] = useState<Bank | null>(null);
  const [entries, setEntries] = useState<PassbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const bankData = await db.banks.get(bankId);
    if (!bankData) {
      router.replace("/banks");
      return;
    }
    setBank(bankData);

    const [txBanks, transactions, debtorEntries, creditorEntries, investmentEntries, debtors, creditors, investments] =
      await Promise.all([
        db.transaction_banks.where("bank_id").equals(bankId).toArray(),
        db.transactions.toArray(),
        db.debtor_entries.toArray(),
        db.creditor_entries.toArray(),
        db.investment_entries.toArray(),
        db.debtors.toArray(),
        db.creditors.toArray(),
        db.investments.toArray(),
      ]);

    const raw: Omit<PassbookEntry, "runningBalance">[] = [];

    for (const tb of txBanks) {
      const tx = transactions.find((t) => t.id === tb.transaction_id);
      if (!tx) continue;
      const isIn = tx.type === "sale";
      raw.push({
        id: tb.id,
        date: tx.date,
        description: `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}${tx.note ? ` · ${tx.note}` : ""}`,
        type: isIn ? "in" : "out",
        amount: tb.amount,
        created_at: tx.created_at,
      });
    }

    for (const de of debtorEntries.filter((e) => e.bank_id === bankId)) {
      if (de.type !== "payment_received") continue;
      const debtor = debtors.find((d) => d.id === de.debtor_id);
      raw.push({
        id: de.id,
        date: de.date,
        description: `Debtor payment · ${debtor?.name || "Unknown"}`,
        type: "in",
        amount: de.amount,
        created_at: de.created_at,
      });
    }

    for (const ce of creditorEntries.filter((e) => e.bank_id === bankId)) {
      if (ce.type !== "payment_made") continue;
      const creditor = creditors.find((c) => c.id === ce.creditor_id);
      raw.push({
        id: ce.id,
        date: ce.date,
        description: `Creditor payment · ${creditor?.name || "Unknown"}`,
        type: "out",
        amount: ce.amount,
        created_at: ce.created_at,
      });
    }

    for (const ie of investmentEntries.filter((e) => e.bank_id === bankId)) {
      const inv = investments.find((i) => i.id === ie.investment_id);
      raw.push({
        id: ie.id,
        date: ie.date,
        description: `${ie.type === "invest" ? "Invested" : "Withdrawn"} · ${inv?.name || "Unknown"}`,
        type: ie.type === "invest" ? "out" : "in",
        amount: ie.amount,
        created_at: ie.created_at,
      });
    }

    raw.sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));

    let balance = bankData.opening_balance;
    const withBalance: PassbookEntry[] = raw.map((entry) => {
      balance += entry.type === "in" ? entry.amount : -entry.amount;
      return { ...entry, runningBalance: balance };
    });

    setEntries(withBalance.reverse());
    setLoading(false);
  }, [bankId, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !bank) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[var(--forest-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentBalance = entries.length > 0 ? entries[0].runningBalance : bank.opening_balance;

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} className="text-[var(--text-primary)]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">{bank.name}</h1>
          <p className="text-xs text-[var(--text-secondary)] capitalize">{bank.type} Account</p>
        </div>
      </div>

      {/* Balance */}
      <div
        className="rounded-2xl p-4 text-white"
        style={{ background: "linear-gradient(135deg, #5A7D60, #6B8F71)" }}
      >
        <p className="text-[10px] uppercase tracking-wider opacity-70">Current Balance</p>
        <p className="text-2xl font-bold mt-1">{formatINR(currentBalance)}</p>
        <p className="text-xs opacity-50 mt-1">Opening: {formatINR(bank.opening_balance)}</p>
      </div>

      {/* Passbook entries */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          Passbook ({entries.length} entries)
        </p>

        {/* Table header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--off-white)] rounded-lg text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
          <span className="w-16">Date</span>
          <span className="flex-1">Description</span>
          <span className="w-20 text-right">Amount</span>
          <span className="w-20 text-right">Balance</span>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-8 text-center">
            No transactions yet.
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] last:border-0"
            >
              <span className="w-16 text-[10px] text-[var(--text-secondary)]">
                {formatDate(entry.date).replace(/, \d{4}/, "")}
              </span>
              <div className="flex-1 flex items-center gap-1">
                {entry.type === "in" ? (
                  <TrendingUp size={10} className="text-[var(--success)] shrink-0" />
                ) : (
                  <TrendingDown size={10} className="text-[var(--danger)] shrink-0" />
                )}
                <span className="text-xs text-[var(--text-primary)] truncate">
                  {entry.description}
                </span>
              </div>
              <span
                className="w-20 text-right text-xs font-semibold"
                style={{ color: entry.type === "in" ? "var(--success)" : "var(--danger)" }}
              >
                {entry.type === "in" ? "+" : "-"}{formatINR(entry.amount)}
              </span>
              <span className="w-20 text-right text-xs font-medium text-[var(--text-primary)]">
                {formatINR(entry.runningBalance)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
