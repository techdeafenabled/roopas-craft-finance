export type TransactionType = "sale" | "purchase" | "expense";
export type ExpenseCategory =
  | "stall"
  | "fuel"
  | "food"
  | "travel"
  | "salary"
  | "helper_salary"
  | "stall_rent"
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
  stall_id: string | null;
  customer_id: string | null;
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
  bank_id: string | null;
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
  bank_id: string | null;
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
      stalls: {
        Row: Stall;
        Insert: Omit<Stall, "id" | "created_at">;
        Update: Partial<Omit<Stall, "id" | "created_at">>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, "id" | "created_at">;
        Update: Partial<Omit<Customer, "id" | "created_at">>;
      };
      investments: {
        Row: Investment;
        Insert: Omit<Investment, "id" | "created_at">;
        Update: Partial<Omit<Investment, "id" | "created_at">>;
      };
      investment_entries: {
        Row: InvestmentEntry;
        Insert: Omit<InvestmentEntry, "id" | "created_at">;
        Update: Partial<Omit<InvestmentEntry, "id" | "created_at">>;
      };
      creditor_installment_plans: {
        Row: CreditorInstallmentPlan;
        Insert: Omit<CreditorInstallmentPlan, "id" | "created_at">;
        Update: Partial<Omit<CreditorInstallmentPlan, "id" | "created_at">>;
      };
      budget_targets: {
        Row: BudgetTarget;
        Insert: Omit<BudgetTarget, "id" | "created_at">;
        Update: Partial<Omit<BudgetTarget, "id" | "created_at">>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, "id" | "created_at">;
        Update: Partial<Omit<ChatMessage, "id" | "created_at">>;
      };
      backup_logs: {
        Row: BackupLog;
        Insert: Omit<BackupLog, "id" | "created_at">;
        Update: Partial<Omit<BackupLog, "id" | "created_at">>;
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

// --- Stalls ---

export type StallStatus = "active" | "completed";
export type StallExpenseCategory = "fuel" | "food" | "travel" | "helper_salary" | "stall_rent" | "other";

export interface Stall {
  id: string;
  name: string;
  place: string;
  start_date: string;
  end_date: string | null;
  stall_rental_fee: number;
  customer_footfall: number;
  status: StallStatus;
  synced: boolean;
  created_at: string;
}

export interface StallWithDetails extends Stall {
  expenses: Transaction[];
  sales: Transaction[];
  total_expenses: number;
  total_sales: number;
  profit: number;
}

// --- Customers ---

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  debtor_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerWithHistory extends Customer {
  transactions: Transaction[];
  debtor_balance: number;
  total_purchases: number;
  visit_count: number;
}

// --- Investments ---

export type InvestmentType = "fd" | "mutual_fund" | "gold" | "stocks" | "other";
export type InvestmentEntryType = "invest" | "withdraw";

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType | null;
  notes: string | null;
  created_at: string;
}

export interface InvestmentEntry {
  id: string;
  investment_id: string;
  type: InvestmentEntryType;
  amount: number;
  bank_id: string;
  date: string;
  note: string | null;
  synced: boolean;
  created_at: string;
}

export interface InvestmentWithBalance extends Investment {
  balance: number;
  entries: InvestmentEntry[];
}

// --- Creditor Installment Plans ---

export type InstallmentFrequency = "weekly" | "monthly" | "quarterly" | "flexible";

export interface CreditorInstallmentPlan {
  id: string;
  creditor_id: string;
  total_amount: number;
  installment_amount: number | null;
  frequency: InstallmentFrequency;
  start_date: string;
  num_installments: number | null;
  note: string | null;
  created_at: string;
}

export interface CreditorWithInstallments extends CreditorWithBalance {
  installment_plan: CreditorInstallmentPlan | null;
  installments_paid: number;
  installments_remaining: number;
  next_due_date: string | null;
}

// --- Budget Targets ---

export interface BudgetTarget {
  id: string;
  month: string;
  target_profit: number;
  target_savings: number;
  target_expenses: number;
  notes: string | null;
  created_at: string;
}

// --- Chat History ---

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// --- Backup Logs ---

export interface BackupLog {
  id: string;
  type: "auto" | "manual";
  status: "success" | "failed";
  snapshot_data: string | null;
  created_at: string;
}
