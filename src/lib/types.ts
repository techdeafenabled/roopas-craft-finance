export type TransactionType = "sale" | "purchase" | "expense";
export type ExpenseCategory =
  | "stall"
  | "fuel"
  | "food"
  | "travel"
  | "salary"
  | "other";
export type DebtorEntryType = "credit_given" | "payment_received";
export type CreditorEntryType = "credit_taken" | "payment_made";

export interface Bank {
  id: string;
  name: string;
  type: "bank" | "cash";
  opening_balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  expense_category: ExpenseCategory | null;
  synced: boolean;
  created_at: string;
}

export interface TransactionBank {
  id: string;
  transaction_id: string;
  bank_id: string;
  amount: number;
}

export interface Debtor {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface DebtorEntry {
  id: string;
  debtor_id: string;
  type: DebtorEntryType;
  amount: number;
  date: string;
  note: string | null;
  synced: boolean;
  created_at: string;
}

export interface Creditor {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface CreditorEntry {
  id: string;
  creditor_id: string;
  type: CreditorEntryType;
  amount: number;
  date: string;
  note: string | null;
  synced: boolean;
  created_at: string;
}

export interface AppSettings {
  id: string;
  pin_hash: string;
  setup_complete: boolean;
  onesignal_player_id: string | null;
  created_at: string;
}

// Supabase Database type
export interface Database {
  public: {
    Tables: {
      app_settings: {
        Row: AppSettings;
        Insert: Omit<AppSettings, "id" | "created_at">;
        Update: Partial<Omit<AppSettings, "id" | "created_at">>;
      };
      banks: {
        Row: Bank;
        Insert: Omit<Bank, "id" | "created_at">;
        Update: Partial<Omit<Bank, "id" | "created_at">>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at">;
        Update: Partial<Omit<Transaction, "id" | "created_at">>;
      };
      transaction_banks: {
        Row: TransactionBank;
        Insert: Omit<TransactionBank, "id">;
        Update: Partial<Omit<TransactionBank, "id">>;
      };
      debtors: {
        Row: Debtor;
        Insert: Omit<Debtor, "id" | "created_at">;
        Update: Partial<Omit<Debtor, "id" | "created_at">>;
      };
      debtor_entries: {
        Row: DebtorEntry;
        Insert: Omit<DebtorEntry, "id" | "created_at">;
        Update: Partial<Omit<DebtorEntry, "id" | "created_at">>;
      };
      creditors: {
        Row: Creditor;
        Insert: Omit<Creditor, "id" | "created_at">;
        Update: Partial<Omit<Creditor, "id" | "created_at">>;
      };
      creditor_entries: {
        Row: CreditorEntry;
        Insert: Omit<CreditorEntry, "id" | "created_at">;
        Update: Partial<Omit<CreditorEntry, "id" | "created_at">>;
      };
    };
  };
}

// With joined bank data, used in UI
export interface TransactionWithBanks extends Transaction {
  transaction_banks: (TransactionBank & { bank: Bank })[];
}

export interface DebtorWithBalance extends Debtor {
  balance: number;
  entries: DebtorEntry[];
}

export interface CreditorWithBalance extends Creditor {
  balance: number;
  entries: CreditorEntry[];
}
