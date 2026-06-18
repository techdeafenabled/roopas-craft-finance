-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- App Settings (single row for this single-user app)
create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  pin_hash text not null,
  setup_complete boolean not null default false,
  onesignal_player_id text,
  created_at timestamptz not null default now()
);

-- Banks / Accounts
create table if not exists banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('bank', 'cash')),
  opening_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Transactions
create table if not exists transactions (
  id uuid primary key,
  type text not null check (type in ('sale', 'purchase', 'expense')),
  amount numeric not null check (amount > 0),
  date date not null,
  note text,
  expense_category text check (expense_category in ('stall','fuel','food','travel','salary','helper_salary','stall_rent','other')),
  stall_id uuid references stalls(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  synced boolean not null default true,
  created_at timestamptz not null default now()
);

-- Transaction bank splits
create table if not exists transaction_banks (
  id uuid primary key,
  transaction_id uuid not null references transactions(id) on delete cascade,
  bank_id uuid not null references banks(id) on delete restrict,
  amount numeric not null check (amount > 0)
);

-- Debtors
create table if not exists debtors (
  id uuid primary key,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

-- Debtor entries
create table if not exists debtor_entries (
  id uuid primary key,
  debtor_id uuid not null references debtors(id) on delete cascade,
  type text not null check (type in ('credit_given', 'payment_received')),
  amount numeric not null check (amount > 0),
  bank_id uuid references banks(id) on delete set null,
  date date not null,
  note text,
  synced boolean not null default true,
  created_at timestamptz not null default now()
);

-- Creditors
create table if not exists creditors (
  id uuid primary key,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

-- Creditor entries
create table if not exists creditor_entries (
  id uuid primary key,
  creditor_id uuid not null references creditors(id) on delete cascade,
  type text not null check (type in ('credit_taken', 'payment_made')),
  amount numeric not null check (amount > 0),
  bank_id uuid references banks(id) on delete set null,
  date date not null,
  note text,
  synced boolean not null default true,
  created_at timestamptz not null default now()
);

-- Stalls / Exhibitions
create table if not exists stalls (
  id uuid primary key,
  name text not null,
  place text not null,
  start_date date not null,
  end_date date,
  stall_rental_fee numeric not null default 0,
  customer_footfall integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed')),
  synced boolean not null default true,
  created_at timestamptz not null default now()
);

-- Customers (all customers, not just debtors)
create table if not exists customers (
  id uuid primary key,
  name text not null,
  phone text,
  debtor_id uuid references debtors(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- Investments (FD, mutual fund, etc.)
create table if not exists investments (
  id uuid primary key,
  name text not null,
  type text check (type in ('fd', 'mutual_fund', 'gold', 'stocks', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

-- Investment entries (invest / withdraw)
create table if not exists investment_entries (
  id uuid primary key,
  investment_id uuid not null references investments(id) on delete cascade,
  type text not null check (type in ('invest', 'withdraw')),
  amount numeric not null check (amount > 0),
  bank_id uuid not null references banks(id) on delete restrict,
  date date not null,
  note text,
  synced boolean not null default true,
  created_at timestamptz not null default now()
);

-- Creditor installment plans
create table if not exists creditor_installment_plans (
  id uuid primary key,
  creditor_id uuid not null references creditors(id) on delete cascade,
  total_amount numeric not null check (total_amount > 0),
  installment_amount numeric,
  frequency text not null check (frequency in ('weekly', 'monthly', 'quarterly', 'flexible')),
  start_date date not null,
  num_installments integer,
  note text,
  created_at timestamptz not null default now()
);

-- Budget targets (monthly)
create table if not exists budget_targets (
  id uuid primary key,
  month text not null,
  target_profit numeric not null default 0,
  target_savings numeric not null default 0,
  target_expenses numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- Chat messages (AI assistant history)
create table if not exists chat_messages (
  id uuid primary key,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Backup logs
create table if not exists backup_logs (
  id uuid primary key,
  type text not null check (type in ('auto', 'manual')),
  status text not null check (status in ('success', 'failed')),
  snapshot_data text,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table app_settings enable row level security;
alter table banks enable row level security;
alter table transactions enable row level security;
alter table transaction_banks enable row level security;
alter table debtors enable row level security;
alter table debtor_entries enable row level security;
alter table creditors enable row level security;
alter table creditor_entries enable row level security;
alter table stalls enable row level security;
alter table customers enable row level security;
alter table investments enable row level security;
alter table investment_entries enable row level security;
alter table creditor_installment_plans enable row level security;
alter table budget_targets enable row level security;
alter table chat_messages enable row level security;
alter table backup_logs enable row level security;

-- Policies: Allow all (single user, PIN-protected app)
create policy "allow_all" on app_settings for all using (true) with check (true);
create policy "allow_all" on banks for all using (true) with check (true);
create policy "allow_all" on transactions for all using (true) with check (true);
create policy "allow_all" on transaction_banks for all using (true) with check (true);
create policy "allow_all" on debtors for all using (true) with check (true);
create policy "allow_all" on debtor_entries for all using (true) with check (true);
create policy "allow_all" on creditors for all using (true) with check (true);
create policy "allow_all" on creditor_entries for all using (true) with check (true);
create policy "allow_all" on stalls for all using (true) with check (true);
create policy "allow_all" on customers for all using (true) with check (true);
create policy "allow_all" on investments for all using (true) with check (true);
create policy "allow_all" on investment_entries for all using (true) with check (true);
create policy "allow_all" on creditor_installment_plans for all using (true) with check (true);
create policy "allow_all" on budget_targets for all using (true) with check (true);
create policy "allow_all" on chat_messages for all using (true) with check (true);
create policy "allow_all" on backup_logs for all using (true) with check (true);

-- Indexes for performance
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_transactions_stall on transactions(stall_id);
create index if not exists idx_transactions_customer on transactions(customer_id);
create index if not exists idx_transaction_banks_tx on transaction_banks(transaction_id);
create index if not exists idx_transaction_banks_bank on transaction_banks(bank_id);
create index if not exists idx_debtor_entries_debtor on debtor_entries(debtor_id);
create index if not exists idx_debtor_entries_bank on debtor_entries(bank_id);
create index if not exists idx_creditor_entries_creditor on creditor_entries(creditor_id);
create index if not exists idx_creditor_entries_bank on creditor_entries(bank_id);
create index if not exists idx_stalls_dates on stalls(start_date, end_date);
create index if not exists idx_stalls_status on stalls(status);
create index if not exists idx_customers_debtor on customers(debtor_id);
create index if not exists idx_investment_entries_investment on investment_entries(investment_id);
create index if not exists idx_investment_entries_bank on investment_entries(bank_id);
create index if not exists idx_creditor_installment_plans_creditor on creditor_installment_plans(creditor_id);
create index if not exists idx_budget_targets_month on budget_targets(month);
