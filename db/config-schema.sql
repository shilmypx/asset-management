-- ITAMS — Configuration schema
-- Run after db/schema.sql, db/views.sql, db/rls-policies.sql.
-- Backs the Configuration page (System Administration → Configuration):
-- HR sync, barcode/label print layout, email notification routing, and
-- approval workflows. Column names here match src/lib/api/configuration.ts
-- exactly — that file is the contract; this schema follows it, not the
-- other way around, since the frontend was built and verified first.

-- ============================================================
-- HR system sync
-- ============================================================

create table hr_sync_settings (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'manual' check (mode in ('manual', 'api')),
  api_endpoint text,
  api_key_encrypted text, -- see the note in src/lib/api/configuration.ts: for real production use, this belongs in a secrets manager with only a reference stored here, not the raw key even "encrypted" in a column
  sync_frequency text not null default 'manual' check (sync_frequency in ('manual', 'hourly', 'daily', 'weekly', 'webhook')),
  webhook_secret text, -- HMAC signing secret for supabase/functions/hr-sync-webhook
  last_synced_at timestamptz,
  is_active boolean not null default false
);

insert into hr_sync_settings (mode, sync_frequency, is_active) values ('manual', 'manual', false);

-- ============================================================
-- Barcode / label print layout
-- ============================================================

create table label_print_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Default',
  is_default boolean not null default true,
  printer_name text,
  page_width_mm numeric(6,2) not null default 210,  -- A4 by default
  page_height_mm numeric(6,2) not null default 297,
  margin_top_mm numeric(6,2) not null default 10,
  margin_left_mm numeric(6,2) not null default 10,
  labels_per_row int not null default 3,
  labels_per_column int not null default 8,
  label_width_mm numeric(6,2) not null default 63.5,
  label_height_mm numeric(6,2) not null default 33.9,
  horizontal_spacing_mm numeric(6,2) not null default 2.5,
  vertical_spacing_mm numeric(6,2) not null default 0,
  font_family text not null default 'sans-serif',
  font_size_pt numeric(4,1) not null default 8,
  barcode_format text not null default 'code128' check (barcode_format in ('code128', 'qr'))
);

insert into label_print_settings (name, is_default) values ('Default', true);

-- ============================================================
-- Email notification routing — who gets what
-- ============================================================

create table notification_routing (
  id uuid primary key default gen_random_uuid(),
  event_type text not null unique,
  recipient_type text not null default 'specific_email' check (recipient_type in ('specific_email', 'role', 'requester_manager')),
  recipient_email text,
  recipient_role_id uuid references roles(id),
  channel text not null default 'email' check (channel in ('email', 'dashboard', 'both')),
  is_active boolean not null default true
);

insert into notification_routing (event_type, recipient_type, recipient_email, channel) values
  ('renewal', 'specific_email', null, 'email'),
  ('warranty_expiry', 'specific_email', null, 'email'),
  ('maintenance_due', 'specific_email', null, 'email'),
  ('repair_delays', 'specific_email', null, 'email'),
  ('assignment', 'specific_email', null, 'email'),
  ('return', 'specific_email', null, 'email'),
  ('approval_requests', 'specific_email', null, 'email'),
  ('audit_due', 'specific_email', null, 'email'),
  ('contract_expiry', 'specific_email', null, 'email'),
  ('low_license_availability', 'specific_email', null, 'email')
on conflict (event_type) do nothing;

-- ============================================================
-- Approval workflow configuration
-- ============================================================

create table approval_rules (
  id uuid primary key default gen_random_uuid(),
  request_type text not null unique check (request_type in ('purchase_order', 'self_service_request', 'asset_disposal', 'change_request')),
  requires_approval boolean not null default true,
  approver_user_id uuid references users(id)
);

insert into approval_rules (request_type, requires_approval) values
  ('purchase_order', true),
  ('self_service_request', true),
  ('asset_disposal', true),
  ('change_request', false)
on conflict (request_type) do nothing;

-- ============================================================
-- RLS — settings-admin only (same has_settings_write() from db/rls-policies.sql)
-- ============================================================

alter table hr_sync_settings enable row level security;
create policy hr_sync_settings_access on hr_sync_settings for all using (has_settings_write()) with check (has_settings_write());

alter table label_print_settings enable row level security;
create policy label_print_settings_read on label_print_settings for select using (auth.role() = 'authenticated'); -- everyone who can print labels needs to read the layout, not just admins
create policy label_print_settings_write on label_print_settings for all using (has_settings_write()) with check (has_settings_write());

alter table notification_routing enable row level security;
create policy notification_routing_access on notification_routing for all using (has_settings_write()) with check (has_settings_write());

alter table approval_rules enable row level security;
create policy approval_rules_read on approval_rules for select using (auth.role() = 'authenticated'); -- Procurement/Self-Service/Disposal screens need to read whether approval is required
create policy approval_rules_write on approval_rules for all using (has_settings_write()) with check (has_settings_write());
