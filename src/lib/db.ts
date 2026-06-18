"use client";
import Dexie, { type Table } from "dexie";
import type {
  Bank,
  Transaction,
  TransactionBank,
  Debtor,
  DebtorEntry,
  Creditor,
  CreditorEntry,
  AppSettings,
  Stall,
  Customer,
  Investment,
  InvestmentEntry,
  CreditorInstallmentPlan,
  BudgetTarget,
  ChatMessage,
  BackupLog,
} from "./types";

export class AppDB extends Dexie {
  app_settings!: Table<AppSettings>;
  banks!: Table<Bank>;
  transactions!: Table<Transaction>;
  transaction_banks!: Table<TransactionBank>;
  debtors!: Table<Debtor>;
  debtor_entries!: Table<DebtorEntry>;
  creditors!: Table<Creditor>;
  creditor_entries!: Table<CreditorEntry>;
  stalls!: Table<Stall>;
  customers!: Table<Customer>;
  investments!: Table<Investment>;
  investment_entries!: Table<InvestmentEntry>;
  creditor_installment_plans!: Table<CreditorInstallmentPlan>;
  budget_targets!: Table<BudgetTarget>;
  chat_messages!: Table<ChatMessage>;
  backup_logs!: Table<BackupLog>;

  constructor() {
    super("RoopasCraftDB");
    this.version(1).stores({
      app_settings: "id",
      banks: "id, name",
      transactions: "id, type, date, synced",
      transaction_banks: "id, transaction_id, bank_id",
      debtors: "id, name",
      debtor_entries: "id, debtor_id, date, synced",
      creditors: "id, name",
      creditor_entries: "id, creditor_id, date, synced",
    });

    this.version(2).stores({
      app_settings: "id",
      banks: "id, name",
      transactions: "id, type, date, synced, stall_id, customer_id",
      transaction_banks: "id, transaction_id, bank_id",
      debtors: "id, name",
      debtor_entries: "id, debtor_id, date, synced, bank_id",
      creditors: "id, name",
      creditor_entries: "id, creditor_id, date, synced, bank_id",
      stalls: "id, status, start_date, synced",
      customers: "id, name, debtor_id",
      investments: "id, name",
      investment_entries: "id, investment_id, bank_id, date, synced",
      creditor_installment_plans: "id, creditor_id",
      budget_targets: "id, month",
      chat_messages: "id, created_at",
      backup_logs: "id, created_at",
    }).upgrade(async (tx) => {
      const debtors = await tx.table("debtors").toArray();
      const customers = debtors.map((d) => ({
        id: crypto.randomUUID(),
        name: d.name,
        phone: d.phone,
        debtor_id: d.id,
        notes: null,
        created_at: new Date().toISOString(),
      }));
      if (customers.length > 0) {
        await tx.table("customers").bulkAdd(customers);
      }
    });
  }
}

export const db = new AppDB();
