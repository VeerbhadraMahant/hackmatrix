-- Transaction review workflow (tags, notes, review_status, reviewed_at)
-- and custom user categorization rules.

alter table transactions add column if not exists tags text;
alter table transactions add column if not exists notes text;
alter table transactions add column if not exists review_status text not null default 'pending';
alter table transactions add column if not exists reviewed_at timestamp with time zone;

create index if not exists idx_transactions_review_status on transactions(user_id, review_status);

create table if not exists categorization_rules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_type text not null default 'contains', -- contains | exact | starts_with | regex
  pattern text not null,
  category text not null,
  tags text,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists idx_categorization_rules_user on categorization_rules(user_id);

alter table categorization_rules enable row level security;

create policy "select_own_rules" on categorization_rules for select using (auth.uid() = user_id);
create policy "insert_own_rules" on categorization_rules for insert with check (auth.uid() = user_id);
create policy "update_own_rules" on categorization_rules for update using (auth.uid() = user_id);
create policy "delete_own_rules" on categorization_rules for delete using (auth.uid() = user_id);
