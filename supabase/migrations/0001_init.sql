-- FinPilot initial schema. All user-owned tables use RLS keyed on auth.uid().
create extension if not exists "uuid-ossp";
create extension if not exists vector;

create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking','savings','credit_card','loan','investment')),
  balance numeric not null default 0,
  credit_limit numeric,
  interest_rate_apr numeric,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  date date not null,
  amount numeric not null,
  merchant text not null,
  category text not null,
  description text,
  is_recurring boolean not null default false,
  recurring_group_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_transactions_user_date on transactions(user_id, date desc);
create index if not exists idx_transactions_recurring_group on transactions(recurring_group_id);

create table if not exists debts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  principal numeric not null,
  interest_rate_apr numeric not null,
  minimum_payment numeric not null,
  due_day_of_month int not null check (due_day_of_month between 1 and 31)
);

create table if not exists incomes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  amount numeric not null,
  frequency text not null,
  next_date date not null
);

create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  target_date date,
  current_amount numeric not null default 0
);

create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  payload_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists insights_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_json jsonb not null,
  health_score numeric not null,
  created_at timestamptz not null default now()
);

-- merchant -> category embedding cache (Gemini gemini-embedding-001, 768-dim)
create table if not exists merchant_category_cache (
  merchant_normalized text primary key,
  category text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

alter table accounts enable row level security;
alter table transactions enable row level security;
alter table debts enable row level security;
alter table incomes enable row level security;
alter table goals enable row level security;
alter table events enable row level security;
alter table insights_snapshots enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['accounts','transactions','debts','incomes','goals','events','insights_snapshots']
  loop
    execute format('create policy "select_own_%1$s" on %1$s for select using (auth.uid() = user_id)', t);
    execute format('create policy "insert_own_%1$s" on %1$s for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "update_own_%1$s" on %1$s for update using (auth.uid() = user_id)', t);
    execute format('create policy "delete_own_%1$s" on %1$s for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
