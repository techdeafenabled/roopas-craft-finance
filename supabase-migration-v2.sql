-- Migration v2: Run this in Supabase SQL Editor if you already have v1 tables
-- This adds new columns to existing tables and creates new tables

-- 1. Add new columns to existing tables
alter table transactions add column if not exists stall_id uuid;
alter table transactions add column if not exists customer_id uuid;
alter table debtor_entries add column if not exists bank_id uuid;
alter table creditor_entries add column if not exists bank_id uuid;

-- 2. Update expense_category check constraint to allow new values
alter table transactions drop constraint if exists transactions_expense_category_check;
alter table transactions add constraint transactions_expense_category_check
  check (expense_category in ('stall','fuel','food','travel','salary','helper_salary','stall_rent','other'));

-- 3. Create new tables

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

create table if not exists customers (
  id uuid primary key,
  name text not null,
  phone text,
  debtor_id uuid references debtors(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists investments (
  id uuid primary key,
  name text not null,
  type text check (type in ('fd', 'mutual_fund', 'gold', 'stocks', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

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

create table if not exists budget_targets (
  id uuid primary key,
  month text not null,
  target_profit numeric not null default 0,
  target_savings numeric not null default 0,
  target_expenses numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists backup_logs (
  id uuid primary key,
  type text not null check (type in ('auto', 'manual')),
  status text not null check (status in ('success', 'failed')),
  snapshot_data text,
  created_at timestamptz not null default now()
);

-- 4. Add foreign key constraints to transactions (after stalls and customers exist)
alter table transactions add constraint fk_transactions_stall
  foreign key (stall_id) references stalls(id) on delete set null;
alter table transactions add constraint fk_transactions_customer
  foreign key (customer_id) references customers(id) on delete set null;
alter table debtor_entries add constraint fk_debtor_entries_bank
  foreign key (bank_id) references banks(id) on delete set null;
alter table creditor_entries add constraint fk_creditor_entries_bank
  foreign key (bank_id) references banks(id) on delete set null;

-- 5. Enable RLS on new tables
alter table stalls enable row level security;
alter table customers enable row level security;
alter table investments enable row level security;
alter table investment_entries enable row level security;
alter table creditor_installment_plans enable row level security;
alter table budget_targets enable row level security;
alter table chat_messages enable row level security;
alter table backup_logs enable row level security;

create policy "allow_all" on stalls for all using (true) with check (true);
create policy "allow_all" on customers for all using (true) with check (true);
create policy "allow_all" on investments for all using (true) with check (true);
create policy "allow_all" on investment_entries for all using (true) with check (true);
create policy "allow_all" on creditor_installment_plans for all using (true) with check (true);
create policy "allow_all" on budget_targets for all using (true) with check (true);
create policy "allow_all" on chat_messages for all using (true) with check (true);
create policy "allow_all" on backup_logs for all using (true) with check (true);

-- 6. Add new indexes
create index if not exists idx_transactions_stall on transactions(stall_id);
create index if not exists idx_transactions_customer on transactions(customer_id);
create index if not exists idx_debtor_entries_bank on debtor_entries(bank_id);
create index if not exists idx_creditor_entries_bank on creditor_entries(bank_id);
create index if not exists idx_stalls_dates on stalls(start_date, end_date);
create index if not exists idx_stalls_status on stalls(status);
create index if not exists idx_customers_debtor on customers(debtor_id);
create index if not exists idx_investment_entries_investment on investment_entries(investment_id);
create index if not exists idx_investment_entries_bank on investment_entries(bank_id);
create index if not exists idx_creditor_installment_plans_creditor on creditor_installment_plans(creditor_id);
create index if not exists idx_budget_targets_month on budget_targets(month);

-- 7. Auto-create customers from existing debtors
insert into customers (id, name, phone, debtor_id, created_at)
select gen_random_uuid(), d.name, d.phone, d.id, now()
from debtors d
where not exists (select 1 from customers c where c.debtor_id = d.id);
