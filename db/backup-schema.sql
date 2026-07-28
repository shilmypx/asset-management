-- ITAMS — Database backup configuration
-- Run after db/schema.sql, db/views.sql, db/rls-policies.sql, db/config-schema.sql.
--
-- SECURITY NOTE: this table intentionally does NOT have columns for the
-- OneDrive client secret or refresh token. OAuth secrets belong in
-- Supabase Edge Function secrets (`supabase secrets set`), never in a
-- Postgres table reachable by the anon key — RLS protects against other
-- users reading it, but it doesn't protect against a compromised anon
-- key or a policy bug exposing a secret that should never have been
-- client-reachable in the first place. Non-secret config (folder path,
-- schedule, notification emails, client ID which is not secret) lives
-- here; the actual bearer token lives only in the Edge Function's
-- environment. See supabase/functions/run-database-backup/index.ts.

create table backup_settings (
  id uuid primary key default gen_random_uuid(),
  is_enabled boolean not null default false,
  frequency text not null default 'daily' check (frequency in ('every_4_hours', 'daily', 'weekly', 'monthly')),
  scheduled_time time not null default '02:00', -- 24-hour, e.g. 02:00 for 2 AM
  day_of_week int check (day_of_week between 0 and 6), -- 0=Sunday, used when frequency='weekly'
  day_of_month int check (day_of_month between 1 and 28), -- capped at 28 to always be valid; used when frequency='monthly'
  onedrive_folder_path text not null default '/ITAMS-Backups',
  onedrive_client_id text, -- not secret — an OAuth app's client ID is meant to be public
  onedrive_tenant_id text,
  failure_notification_emails text[] not null default '{}',
  last_backup_at timestamptz,
  last_backup_status text check (last_backup_status in ('success', 'failed', 'running')),
  last_backup_message text,
  last_backup_file_name text
);

create table backup_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('success', 'failed', 'running')),
  trigger_type text not null check (trigger_type in ('scheduled', 'manual')),
  file_name text,
  onedrive_path text,
  error_message text,
  table_count int,
  row_count int
);

insert into backup_settings (is_enabled, frequency, scheduled_time, onedrive_folder_path)
values (false, 'daily', '02:00', '/ITAMS-Backups');

alter table backup_settings enable row level security;
create policy backup_settings_access on backup_settings for all
  using (has_settings_write()) with check (has_settings_write());

alter table backup_runs enable row level security;
create policy backup_runs_read on backup_runs for select using (has_settings_write());
create policy backup_runs_insert on backup_runs for insert with check (true); -- Edge Function writes via service role, which bypasses RLS anyway
