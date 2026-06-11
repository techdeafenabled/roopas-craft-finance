"use client";
import { db } from "./db";
import { supabase } from "./supabase";
import type { Bank, Transaction, TransactionBank, Debtor, DebtorEntry, Creditor, CreditorEntry } from "./types";

export async function syncToSupabase() {
  try {
    const [
      unsyncedTransactions,
      unsyncedDebtorEntries,
      unsyncedCreditorEntries,
    ] = await Promise.all([
      db.transactions.where("synced").equals(0).toArray(),
      db.debtor_entries.where("synced").equals(0).toArray(),
      db.creditor_entries.where("synced").equals(0).toArray(),
    ]);

    for (const tx of unsyncedTransactions) {
      const { error } = await supabase.from("transactions").upsert({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        note: tx.note,
        expense_category: tx.expense_category,
        synced: true,
        created_at: tx.created_at,
      });
      if (!error) {
        const txBanks = await db.transaction_banks
          .where("transaction_id")
          .equals(tx.id)
          .toArray();
        await supabase.from("transaction_banks").upsert(txBanks);
        await db.transactions.update(tx.id, { synced: true } as Partial<Transaction>);
      }
    }

    for (const entry of unsyncedDebtorEntries) {
      const { error } = await supabase.from("debtor_entries").upsert({
        ...entry,
        synced: true,
      });
      if (!error) await db.debtor_entries.update(entry.id, { synced: true } as Partial<DebtorEntry>);
    }

    for (const entry of unsyncedCreditorEntries) {
      const { error } = await supabase.from("creditor_entries").upsert({
        ...entry,
        synced: true,
      });
      if (!error) await db.creditor_entries.update(entry.id, { synced: true } as Partial<CreditorEntry>);
    }
  } catch {
    // Sync failed silently — will retry on next connection
  }
}

export async function syncFromSupabase() {
  try {
    const [
      { data: banks },
      { data: transactions },
      { data: txBanks },
      { data: debtors },
      { data: debtorEntries },
      { data: creditors },
      { data: creditorEntries },
    ] = await Promise.all([
      supabase.from("banks").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("transaction_banks").select("*"),
      supabase.from("debtors").select("*"),
      supabase.from("debtor_entries").select("*"),
      supabase.from("creditors").select("*"),
      supabase.from("creditor_entries").select("*"),
    ]);

    await db.transaction("rw", [
      db.banks,
      db.transactions,
      db.transaction_banks,
      db.debtors,
      db.debtor_entries,
      db.creditors,
      db.creditor_entries,
    ], async () => {
      if (banks) await db.banks.bulkPut(banks as Bank[]);
      if (transactions) await db.transactions.bulkPut(transactions as Transaction[]);
      if (txBanks) await db.transaction_banks.bulkPut(txBanks as TransactionBank[]);
      if (debtors) await db.debtors.bulkPut(debtors as Debtor[]);
      if (debtorEntries) await db.debtor_entries.bulkPut(debtorEntries as DebtorEntry[]);
      if (creditors) await db.creditors.bulkPut(creditors as Creditor[]);
      if (creditorEntries) await db.creditor_entries.bulkPut(creditorEntries as CreditorEntry[]);
    });
  } catch {
    // Sync from cloud failed — offline data remains available
  }
}
