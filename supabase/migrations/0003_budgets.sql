-- User-defined monthly spending limits per category, plus the transactions
-- table's ledger-query indexes (transactions itself already exists from
-- 0001_init.sql; this migration only adds what the ledger/budgets endpoints
-- need that isn't there yet).
create table if not exists budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric not null,
  unique (user_id, category)
);
create index if not exists idx_budgets_user on budgets(user_id);

alter table budgets enable row level security;

create policy "select_own_budgets" on budgets for select using (auth.uid() = user_id);
create policy "insert_own_budgets" on budgets for insert with check (auth.uid() = user_id);
create policy "update_own_budgets" on budgets for update using (auth.uid() = user_id);
create policy "delete_own_budgets" on budgets for delete using (auth.uid() = user_id);

-- Ledger search/filter support: case-insensitive merchant substring search
-- and category filtering both benefit from these indexes.
create extension if not exists pg_trgm;
create index if not exists idx_transactions_user_category on transactions(user_id, category);
create index if not exists idx_transactions_merchant_trgm on transactions using gin (merchant gin_trgm_ops);
