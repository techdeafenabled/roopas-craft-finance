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
  expense_category text check (expense_category in ('stall','fuel','food','travel','salary','other')),
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
  date date not null,
  note text,
  synced boolean not null default true,
  created_at timestamptz not null default now()
);

-- Row Level Security: Allow all operations (single-user app, PIN is the auth)
-- WARNING: This means anyone with your Supabase anon key can access data.
-- For extra security, consider adding a secret token check or using Supabase Auth.
alter table app_settings enable row level security;
alter table banks enable row level security;
alter table transactions enable row level security;
alter table transaction_banks enable row level security;
alter table debtors enable row level security;
alter table debtor_entries enable row level security;
alter table creditors enable row level security;
alter table creditor_entries enable row level security;

-- Policies: Allow all (single user, PIN-protected app)
create policy "allow_all" on app_settings for all using (true) with check (true);
create policy "allow_all" on banks for all using (true) with check (true);
create policy "allow_all" on transactions for all using (true) with check (true);
create policy "allow_all" on transaction_banks for all using (true) with check (true);
create policy "allow_all" on debtors for all using (true) with check (true);
create policy "allow_all" on debtor_entries for all using (true) with check (true);
create policy "allow_all" on creditors for all using (true) with check (true);
create policy "allow_all" on creditor_entries for all using (true) with check (true);

-- Indexes for performance
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_transaction_banks_tx on transaction_banks(transaction_id);
create index if not exists idx_transaction_banks_bank on transaction_banks(bank_id);
create index if not exists idx_debtor_entries_debtor on debtor_entries(debtor_id);
create index if not exists idx_creditor_entries_creditor on creditor_entries(creditor_id);
