-- ITAMS — Configuration schema additions
-- Run this after db/schema.sql, db/views.sql, and db/rls-policies.sql.
-- Backs the System Administration → Configuration page: HR sync,
-- barcode/label print layout, email notification routing, and approvals.

-- ============================================================
-- HR system sync configuration
-- ============================================================

-- Singleton-per-company row (one company_id = null row means "global
-- default" if you don't want per-company HR systems). Manual entry
-- remains the default (is_enabled = false) — this table only matters
-- once there's an actual HR system to sync with.
create table hr_sync_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id), -- null = global default
  is_enabled boolean not null default false,
  sync_mode text not null default 'manual' check (sync_mode in ('manual', 'scheduled', 'webhook')),
  sync_interval_minutes int, -- used when sync_mode = 'scheduled'
  api_endpoint text, -- HR system's API base URL, for scheduled pull mode
  api_key text, -- see note in rls-policies.sql on this table below re: secrets
  webhook_secret text, -- HR system signs requests to our webhook with this
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_message text
);

-- ============================================================
-- Barcode / label print layout configuration
-- ============================================================

create table label_print_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id), -- null = global default
  printer_name text,
  page_size text not null default 'A4' check (page_size in ('A4', 'Letter', 'Custom')),
  custom_page_width_mm numeric(6,2), -- used when page_size = 'Custom'
  custom_page_height_mm numeric(6,2),
  labels_per_row int not null default 3,
  labels_per_column int not null default 8,
  label_width_mm numeric(6,2) not null default 50,
  label_height_mm numeric(6,2) not null default 25,
  horizontal_spacing_mm numeric(6,2) not null default 3,
  vertical_spacing_mm numeric(6,2) not null default 3,
  margin_top_mm numeric(6,2) not null default 10,
  margin_left_mm numeric(6,2) not null default 10,
  font_size_pt numeric(4,1) not null default 8,
  default_format text not null default 'barcode' check (default_format in ('barcode', 'qr'))
);

-- ============================================================
-- Email notification routing — who gets what.
-- notification_templates (db/schema.sql) already holds the
-- subject/body per event_type; this adds the recipient side.
-- ============================================================

create table notification_routing (
  id uuid primary key default gen_random_uuid(),
  event_type text not null unique, -- matches notification_templates.event_type and automation_rules.trigger_event where applicable
  is_enabled boolean not null default true,
  recipient_emails text[] not null default '{}',
  also_notify_dashboard boolean not null default true
);

-- ============================================================
-- Approval workflow configuration
-- ============================================================

create table approval_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id), -- null = global default
  workflow_type text not null check (workflow_type in ('purchase_order', 'asset_disposal', 'self_service_request', 'change_request')),
  approval_required boolean not null default true,
  approver_user_id uuid references users(id),
  unique (company_id, workflow_type)
);

-- ============================================================
-- Seed sensible defaults so the Configuration page has something
-- to show on first load rather than an empty state everywhere.
-- ============================================================

insert into hr_sync_settings (company_id, is_enabled, sync_mode) values (null, false, 'manual');

insert into label_print_settings (company_id) values (null);

insert into notification_routing (event_type, recipient_emails) values
  ('warranty_expiring', '{}'),
  ('contract_expiring', '{}'),
  ('license_threshold_reached', '{}'),
  ('repair_returned', '{}'),
  ('incident_assigned', '{}'),
  ('purchase_order_pending_approval', '{}'),
  ('disposal_pending_approval', '{}'),
  ('self_service_request_submitted', '{}')
on conflict (event_type) do nothing;

insert into approval_settings (company_id, workflow_type, approval_required) values
  (null, 'purchase_order', true),
  (null, 'asset_disposal', true),
  (null, 'self_service_request', true),
  (null, 'change_request', true)
on conflict (company_id, workflow_type) do nothing;
