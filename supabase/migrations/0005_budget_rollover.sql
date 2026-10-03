-- Budget surplus rollover support and created_at timestamp.

alter table budgets add column if not exists rollover_enabled boolean not null default false;
alter table budgets add column if not exists rollover_cap numeric;
alter table budgets add column if not exists created_at timestamp with time zone not null default timezone('utc'::text, now());
