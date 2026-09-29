-- Security audit trail: authentication denials and data-mutating requests.
-- Written by the backend using the service-role connection (not by
-- end-user browser sessions), so this only needs a read policy for the
-- owning user -- inserts happen server-side only.
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  method text not null,
  path text not null,
  status_code int not null,
  client_ip text,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_user_created on audit_logs(user_id, created_at desc);
create index if not exists idx_audit_logs_event_type on audit_logs(event_type);

alter table audit_logs enable row level security;

create policy "select_own_audit_logs" on audit_logs for select using (auth.uid() = user_id);
-- No insert/update/delete policy for regular users: only the backend
-- (service-role connection, which bypasses RLS entirely) ever writes here.
