"use client";
import { db } from "./db";
import { supabase } from "./supabase";
import type {
  Bank,
  Transaction,
  TransactionBank,
  Debtor,
  DebtorEntry,
  Creditor,
  CreditorEntry,
  Stall,
  Customer,
  Investment,
  InvestmentEntry,
  CreditorInstallmentPlan,
  BudgetTarget,
  ChatMessage,
  BackupLog,
} from "./types";

export async function syncToSupabase() {
  try {
    const [
      unsyncedTransactions,
      unsyncedDebtorEntries,
      unsyncedCreditorEntries,
      unsyncedStalls,
      unsyncedInvestmentEntries,
    ] = await Promise.all([
      db.transactions.where("synced").equals(0).toArray(),
      db.debtor_entries.where("synced").equals(0).toArray(),
      db.creditor_entries.where("synced").equals(0).toArray(),
      db.stalls.where("synced").equals(0).toArray(),
      db.investment_entries.where("synced").equals(0).toArray(),
    ]);

    for (const tx of unsyncedTransactions) {
      const { error } = await supabase.from("transactions").upsert({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        note: tx.note,
        expense_category: tx.expense_category,
        stall_id: tx.stall_id,
        customer_id: tx.customer_id,
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

    for (const stall of unsyncedStalls) {
      const { error } = await supabase.from("stalls").upsert({
        ...stall,
        synced: true,
      });
      if (!error) await db.stalls.update(stall.id, { synced: true } as Partial<Stall>);
    }

    for (const entry of unsyncedInvestmentEntries) {
      const { error } = await supabase.from("investment_entries").upsert({
        ...entry,
        synced: true,
      });
      if (!error) await db.investment_entries.update(entry.id, { synced: true } as Partial<InvestmentEntry>);
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
      { data: stalls },
      { data: customers },
      { data: investments },
      { data: investmentEntries },
      { data: installmentPlans },
      { data: budgetTargets },
      { data: chatMessages },
      { data: backupLogs },
    ] = await Promise.all([
      supabase.from("banks").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("transaction_banks").select("*"),
      supabase.from("debtors").select("*"),
      supabase.from("debtor_entries").select("*"),
      supabase.from("creditors").select("*"),
      supabase.from("creditor_entries").select("*"),
      supabase.from("stalls").select("*"),
      supabase.from("customers").select("*"),
      supabase.from("investments").select("*"),
      supabase.from("investment_entries").select("*"),
      supabase.from("creditor_installment_plans").select("*"),
      supabase.from("budget_targets").select("*"),
      supabase.from("chat_messages").select("*"),
      supabase.from("backup_logs").select("*"),
    ]);

    await db.transaction("rw", [
      db.banks,
      db.transactions,
      db.transaction_banks,
      db.debtors,
      db.debtor_entries,
      db.creditors,
      db.creditor_entries,
      db.stalls,
      db.customers,
      db.investments,
      db.investment_entries,
      db.creditor_installment_plans,
      db.budget_targets,
      db.chat_messages,
      db.backup_logs,
    ], async () => {
      if (banks) await db.banks.bulkPut(banks as Bank[]);
      if (transactions) await db.transactions.bulkPut(transactions as Transaction[]);
      if (txBanks) await db.transaction_banks.bulkPut(txBanks as TransactionBank[]);
      if (debtors) await db.debtors.bulkPut(debtors as Debtor[]);
      if (debtorEntries) await db.debtor_entries.bulkPut(debtorEntries as DebtorEntry[]);
      if (creditors) await db.creditors.bulkPut(creditors as Creditor[]);
      if (creditorEntries) await db.creditor_entries.bulkPut(creditorEntries as CreditorEntry[]);
      if (stalls) await db.stalls.bulkPut(stalls as Stall[]);
      if (customers) await db.customers.bulkPut(customers as Customer[]);
      if (investments) await db.investments.bulkPut(investments as Investment[]);
      if (investmentEntries) await db.investment_entries.bulkPut(investmentEntries as InvestmentEntry[]);
      if (installmentPlans) await db.creditor_installment_plans.bulkPut(installmentPlans as CreditorInstallmentPlan[]);
      if (budgetTargets) await db.budget_targets.bulkPut(budgetTargets as BudgetTarget[]);
      if (chatMessages) await db.chat_messages.bulkPut(chatMessages as ChatMessage[]);
      if (backupLogs) await db.backup_logs.bulkPut(backupLogs as BackupLog[]);
    });
  } catch {
    // Sync from cloud failed — offline data remains available
  }
}
