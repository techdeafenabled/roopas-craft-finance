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
  }
}

export const db = new AppDB();
