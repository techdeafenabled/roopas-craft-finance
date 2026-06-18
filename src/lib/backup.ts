"use client";
import { db } from "./db";
import { supabase } from "./supabase";
import { generateId } from "./format";
import type { BackupLog } from "./types";

const LAST_BACKUP_KEY = "rcj_last_backup";
const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface BackupData {
  version: 2;
  created_at: string;
  tables: {
    banks: unknown[];
    transactions: unknown[];
    transaction_banks: unknown[];
    debtors: unknown[];
    debtor_entries: unknown[];
    creditors: unknown[];
    creditor_entries: unknown[];
    stalls: unknown[];
    customers: unknown[];
    investments: unknown[];
    investment_entries: unknown[];
    creditor_installment_plans: unknown[];
    budget_targets: unknown[];
  };
}

export async function createBackup(): Promise<BackupData> {
  const [
    banks, transactions, transaction_banks,
    debtors, debtor_entries, creditors, creditor_entries,
    stalls, customers, investments, investment_entries,
    creditor_installment_plans, budget_targets,
  ] = await Promise.all([
    db.banks.toArray(),
    db.transactions.toArray(),
    db.transaction_banks.toArray(),
    db.debtors.toArray(),
    db.debtor_entries.toArray(),
    db.creditors.toArray(),
    db.creditor_entries.toArray(),
    db.stalls.toArray(),
    db.customers.toArray(),
    db.investments.toArray(),
    db.investment_entries.toArray(),
    db.creditor_installment_plans.toArray(),
    db.budget_targets.toArray(),
  ]);

  return {
    version: 2,
    created_at: new Date().toISOString(),
    tables: {
      banks, transactions, transaction_banks,
      debtors, debtor_entries, creditors, creditor_entries,
      stalls, customers, investments, investment_entries,
      creditor_installment_plans, budget_targets,
    },
  };
}

export async function saveBackupToCloud(type: "auto" | "manual"): Promise<boolean> {
  try {
    const backup = await createBackup();
    const log: BackupLog = {
      id: generateId(),
      type,
      status: "success",
      snapshot_data: JSON.stringify(backup),
      created_at: new Date().toISOString(),
    };

    await db.backup_logs.put(log);

    if (navigator.onLine) {
      await supabase.from("backup_logs").insert(log);
    }

    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    return true;
  } catch {
    const log: BackupLog = {
      id: generateId(),
      type,
      status: "failed",
      snapshot_data: null,
      created_at: new Date().toISOString(),
    };
    await db.backup_logs.put(log);
    return false;
  }
}

export function downloadBackupAsJson(backup: BackupData) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rcj-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function restoreFromBackup(backup: BackupData): Promise<boolean> {
  try {
    if (!backup.version || !backup.tables) {
      throw new Error("Invalid backup file");
    }

    const t = backup.tables;

    await db.transaction("rw", [
      db.banks, db.transactions, db.transaction_banks,
      db.debtors, db.debtor_entries, db.creditors, db.creditor_entries,
      db.stalls, db.customers, db.investments, db.investment_entries,
      db.creditor_installment_plans, db.budget_targets,
    ], async () => {
      if (t.banks?.length) await db.banks.bulkPut(t.banks as never[]);
      if (t.transactions?.length) await db.transactions.bulkPut(t.transactions as never[]);
      if (t.transaction_banks?.length) await db.transaction_banks.bulkPut(t.transaction_banks as never[]);
      if (t.debtors?.length) await db.debtors.bulkPut(t.debtors as never[]);
      if (t.debtor_entries?.length) await db.debtor_entries.bulkPut(t.debtor_entries as never[]);
      if (t.creditors?.length) await db.creditors.bulkPut(t.creditors as never[]);
      if (t.creditor_entries?.length) await db.creditor_entries.bulkPut(t.creditor_entries as never[]);
      if (t.stalls?.length) await db.stalls.bulkPut(t.stalls as never[]);
      if (t.customers?.length) await db.customers.bulkPut(t.customers as never[]);
      if (t.investments?.length) await db.investments.bulkPut(t.investments as never[]);
      if (t.investment_entries?.length) await db.investment_entries.bulkPut(t.investment_entries as never[]);
      if (t.creditor_installment_plans?.length) await db.creditor_installment_plans.bulkPut(t.creditor_installment_plans as never[]);
      if (t.budget_targets?.length) await db.budget_targets.bulkPut(t.budget_targets as never[]);
    });

    return true;
  } catch {
    return false;
  }
}

export function getLastBackupTime(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

export function shouldAutoBackup(): boolean {
  const last = getLastBackupTime();
  if (!last) return true;
  return Date.now() - new Date(last).getTime() > AUTO_BACKUP_INTERVAL_MS;
}
