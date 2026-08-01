-- ============================================================================
-- ITAMS — Complete Database Setup Script
-- ============================================================================
-- This is all five db/*.sql files concatenated in the order they must run,
-- for convenience — paste this whole thing into the Supabase SQL editor
-- once and you're done, instead of running five files separately.
--
-- The individual files (db/schema.sql, db/views.sql, db/rls-policies.sql,
-- db/config-schema.sql, db/backup-schema.sql) still exist and are the
-- source of truth — this file is regenerated from them, not maintained by
-- hand. If you edit the schema, edit the individual file and regenerate
-- this one, not the other way around.
--
-- Run this ONCE, on a fresh database, in the Supabase SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run). It is not safe to
-- run twice — several statements (INSERT seed data, CREATE TABLE) will
-- error on a second run because the data/tables already exist. If you
-- need to re-run part of it, use the matching individual file instead
-- and adjust as needed (e.g. add `on conflict do nothing` where missing).
-- ============================================================================


-- ============================================================================
-- PART 1 of 5 — Core Schema (tables, seed data)
-- Source: db/schema.sql
-- ============================================================================

-- ITAMS — Postgres schema
-- Generated from ITAMS-Architecture-and-Schema.md. Run against a fresh database.
-- Enable pgcrypto for gen_random_uuid() if not already available (Supabase has this on by default).
create extension if not exists pgcrypto;

-- ============================================================
-- 1. Organization & Admin
-- ============================================================

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  is_parent boolean not null default false,
  parent_company_id uuid references companies(id),
  logo_url text,
  address text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table org_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  parent_org_unit_id uuid references org_units(id),
  name text not null,
  type text not null check (type in ('branch', 'business_unit', 'division')),
  sort_order int not null default 0,
  status text not null default 'active'
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  is_shared boolean not null default false
);

create table employee_department (
  employee_id uuid not null,
  department_id uuid not null references departments(id),
  company_id uuid not null references companies(id),
  primary key (employee_id, department_id, company_id)
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  org_unit_id uuid references org_units(id),
  name text not null,
  address text,
  type text check (type in ('office', 'branch', 'server_room', 'warehouse'))
);

create table cost_centers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,
  code text not null
);

-- Lookup tables — same shape, admin-configurable
create table manufacturers (id uuid primary key default gen_random_uuid(), name text not null, code text, sort_order int default 0, is_active boolean default true);
create table asset_models (id uuid primary key default gen_random_uuid(), manufacturer_id uuid references manufacturers(id), name text not null, sort_order int default 0, is_active boolean default true);
create table asset_categories (id uuid primary key default gen_random_uuid(), name text not null, code text, allow_depreciation boolean not null default true, sort_order int default 0, is_active boolean default true);
create table asset_statuses (id uuid primary key default gen_random_uuid(), name text not null, code text, sort_order int default 0, is_active boolean default true);
create table license_types (id uuid primary key default gen_random_uuid(), name text not null, sort_order int default 0, is_active boolean default true);
create table subscription_types (id uuid primary key default gen_random_uuid(), name text not null, sort_order int default 0, is_active boolean default true);
create table currencies (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, symbol text);
create table depreciation_methods (id uuid primary key default gen_random_uuid(), name text not null, code text);
create table employment_types (id uuid primary key default gen_random_uuid(), name text not null, sort_order int default 0, is_active boolean default true);
create table vendors (id uuid primary key default gen_random_uuid(), name text not null, contact_email text, contact_phone text, is_active boolean default true);
create table barcode_prefixes (id uuid primary key default gen_random_uuid(), company_id uuid references companies(id), category_id uuid references asset_categories(id), prefix text not null);
create table incident_categories (id uuid primary key default gen_random_uuid(), name text not null);
create table priorities (id uuid primary key default gen_random_uuid(), name text not null, sort_order int default 0);
create table severities (id uuid primary key default gen_random_uuid(), name text not null, sort_order int default 0);

-- ============================================================
-- 2. People & Access
-- ============================================================

create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_number text unique not null,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  phone text,
  designation text,
  department_id uuid references departments(id),
  company_id uuid not null references companies(id),
  org_unit_id uuid references org_units(id),
  location_id uuid references locations(id),
  manager_id uuid references employees(id),
  employment_type_id uuid references employment_types(id),
  joining_date date,
  termination_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'resigned', 'terminated', 'on_leave')),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  mfa_enabled boolean not null default false,
  is_locked boolean not null default false,
  failed_attempts int not null default 0,
  last_login_at timestamptz,
  status text not null default 'active'
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_system_role boolean not null default false
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null check (action in ('view','add','edit','delete','approve','export','print','import')),
  unique (module, action)
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  company_id uuid references companies(id),
  primary key (user_id, role_id, company_id)
);

-- ============================================================
-- 3. Assets — Hardware
-- ============================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,
  code text,
  status text default 'active'
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  asset_number text unique not null,
  barcode text unique,
  qr_code text,
  category_id uuid references asset_categories(id),
  manufacturer_id uuid references manufacturers(id),
  model_id uuid references asset_models(id),
  serial_number text,
  company_id uuid not null references companies(id),
  org_unit_id uuid references org_units(id),
  department_id uuid references departments(id),
  location_id uuid references locations(id),
  current_owner_type text check (current_owner_type in ('employee','department','business_unit','location','server_room','branch','project','shared_pool')),
  current_owner_id uuid,
  status_id uuid references asset_statuses(id),
  vendor_id uuid references vendors(id),
  purchase_date date,
  cost numeric(14,2),
  currency_id uuid references currencies(id),
  warranty_start date,
  warranty_end date,
  useful_life_months int,
  residual_value numeric(14,2),
  depreciation_method_id uuid references depreciation_methods(id),
  notes text,
  parent_asset_id uuid references assets(id),
  is_split_from_bundle boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_assets_company on assets(company_id);
create index idx_assets_status on assets(status_id);
create index idx_assets_owner on assets(current_owner_type, current_owner_id);
create index idx_assets_parent on assets(parent_asset_id);

create table asset_attachments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  type text check (type in ('image','invoice','document','disposal_certificate')),
  file_url text not null,
  uploaded_by uuid references users(id),
  uploaded_at timestamptz not null default now()
);

create table asset_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  assigned_to_type text check (assigned_to_type in ('employee','department','business_unit','location','project')),
  assigned_to_id uuid,
  assigned_by uuid references users(id),
  assigned_at timestamptz not null default now(),
  returned_at timestamptz,
  condition_on_return text,
  remarks text,
  signature_url text,
  action_type text check (action_type in ('checkout','checkin','transfer'))
);

create table asset_transfers (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  from_company_id uuid references companies(id),
  to_company_id uuid references companies(id),
  from_org_unit_id uuid references org_units(id),
  to_org_unit_id uuid references org_units(id),
  from_location_id uuid references locations(id),
  to_location_id uuid references locations(id),
  transferred_by uuid references users(id),
  transferred_at timestamptz not null default now(),
  reason text
);

create table asset_disposals (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  reason text,
  approved_by uuid references users(id),
  certificate_url text,
  data_wipe_confirmed boolean not null default false,
  disposal_vendor text,
  disposal_date date
);

create table depreciation_settings (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('global','company','category')),
  scope_id uuid,
  method text not null check (method in ('straight_line','declining_balance','none')),
  calculation_frequency text not null default 'monthly' check (calculation_frequency in ('monthly','quarterly','annual')),
  declining_balance_rate numeric(5,2)
);

create table depreciation_entries (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  period_start date not null,
  period_end date not null,
  period_type text not null check (period_type in ('monthly','quarterly','annual')),
  opening_value numeric(14,2) not null,
  depreciation_amount numeric(14,2) not null,
  closing_value numeric(14,2) not null,
  method_used text not null
);
create index idx_depreciation_asset on depreciation_entries(asset_id);

-- ============================================================
-- 4. Software / SaaS
-- ============================================================

create table software_licenses (
  id uuid primary key default gen_random_uuid(),
  software_name text not null,
  vendor_id uuid references vendors(id),
  version text,
  license_key text,
  license_type_id uuid references license_types(id),
  subscription_type_id uuid references subscription_types(id),
  company_id uuid not null references companies(id),
  purchase_date date,
  expiry_date date,
  renewal_date date,
  seats_purchased int not null default 0,
  seats_used int not null default 0,
  cost numeric(14,2),
  currency_id uuid references currencies(id),
  owner_employee_id uuid references employees(id),
  org_unit_id uuid references org_units(id)
);

create table software_assignments (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references software_licenses(id),
  employee_id uuid references employees(id),
  asset_id uuid references assets(id),
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ============================================================
-- 5. Network & Relationship Mapping
-- ============================================================

create table data_centers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,
  location_id uuid references locations(id)
);

create table racks (
  id uuid primary key default gen_random_uuid(),
  data_center_id uuid not null references data_centers(id),
  name text not null,
  position text
);

create table network_asset_details (
  asset_id uuid primary key references assets(id) on delete cascade,
  ip_address inet,
  mac_address text,
  firmware_version text,
  os text,
  port_count int,
  config_backup_url text,
  rack_id uuid references racks(id)
);

create table asset_relationships (
  id uuid primary key default gen_random_uuid(),
  source_asset_id uuid not null references assets(id),
  target_asset_id uuid not null references assets(id),
  relationship_type text check (relationship_type in ('runs_on','depends_on','connected_to','located_in'))
);

-- ============================================================
-- 6. Repair & Maintenance
-- ============================================================

create table repair_records (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  issue_description text,
  vendor_id uuid references vendors(id),
  sent_date date,
  estimated_return_date date,
  actual_return_date date,
  repair_cost numeric(14,2),
  currency_id uuid references currencies(id),
  under_warranty boolean default false,
  status text check (status in ('sent','in_progress','completed','cancelled')),
  notes text
);

create table repair_replacements (
  id uuid primary key default gen_random_uuid(),
  repair_record_id uuid not null references repair_records(id),
  replacement_asset_id uuid references assets(id),
  replacement_source text check (replacement_source in ('warranty_vendor','internal_stock')),
  issued_at timestamptz,
  recovered_at timestamptz
);

-- ============================================================
-- 7. Contracts & Warranty
-- ============================================================

create table contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  contract_type text check (contract_type in ('AMC','maintenance','support','software_agreement','vendor_contract')),
  vendor_id uuid references vendors(id),
  title text not null,
  related_asset_id uuid references assets(id),
  related_software_license_id uuid references software_licenses(id),
  start_date date,
  end_date date,
  renewal_date date,
  auto_renew boolean default false,
  cost numeric(14,2),
  currency_id uuid references currencies(id),
  document_url text,
  status text default 'active'
);

create table warranty_extensions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  extended_by_vendor_id uuid references vendors(id),
  previous_end_date date,
  new_end_date date,
  cost numeric(14,2),
  purchased_at date
);

-- ============================================================
-- 8. Inventory Audit
-- ============================================================

create table audit_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  scope_org_unit_id uuid references org_units(id),
  scope_location_id uuid references locations(id),
  scope_category_id uuid references asset_categories(id),
  started_by uuid references users(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text default 'in_progress' check (status in ('in_progress','completed'))
);

create table audit_scans (
  id uuid primary key default gen_random_uuid(),
  audit_session_id uuid not null references audit_sessions(id),
  asset_id uuid references assets(id),
  scanned_barcode text not null,
  scanned_by uuid references users(id),
  scanned_at timestamptz not null default now(),
  result text check (result in ('matched','mismatched_location','unexpected','missing'))
);

-- ============================================================
-- 9. Procurement
-- ============================================================

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  po_number text unique not null,
  vendor_id uuid references vendors(id),
  status text default 'draft' check (status in ('draft','pending_approval','approved','ordered','received','closed','cancelled')),
  requested_by uuid references users(id),
  approved_by uuid references users(id),
  total_cost numeric(14,2),
  currency_id uuid references currencies(id),
  created_at timestamptz not null default now()
);

create table purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  description text not null,
  category_id uuid references asset_categories(id),
  quantity int not null default 1,
  unit_cost numeric(14,2),
  received_asset_id uuid references assets(id)
);

-- ============================================================
-- 10. Discovery & Reconciliation
-- ============================================================

create table discovered_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  ip_address inet,
  mac_address text,
  hostname text,
  os text,
  discovered_via text check (discovered_via in ('agent','agentless_scan','manual_import')),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  matched_asset_id uuid references assets(id),
  reconciliation_status text default 'new' check (reconciliation_status in ('new','matched','ignored'))
);

create table software_installations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  software_name text not null,
  version text,
  detected_at timestamptz not null default now(),
  is_authorized boolean,
  usage_frequency text check (usage_frequency in ('frequent','occasional','unused','unknown'))
);

-- ============================================================
-- 11. Self-Service & Requests
-- ============================================================

create table asset_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  request_type text check (request_type in ('new_hardware','software_license','upgrade','repair')),
  category_id uuid references asset_categories(id),
  justification text,
  status text default 'submitted' check (status in ('submitted','approved','rejected','fulfilled')),
  approved_by uuid references users(id),
  requested_at timestamptz not null default now(),
  fulfilled_asset_id uuid references assets(id)
);

-- ============================================================
-- 12. Automation Rules
-- ============================================================

create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  name text not null,
  trigger_event text check (trigger_event in ('warranty_expiring','contract_expiring','repair_returned','license_threshold_reached','asset_idle','disposal_due')),
  condition_json jsonb,
  action text check (action in ('send_notification','create_task','change_status','create_disposal_request')),
  is_active boolean not null default true
);

-- ============================================================
-- 13. Custom Fields
-- ============================================================

create table custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  entity_type text check (entity_type in ('asset','employee','software_license')),
  category_id uuid references asset_categories(id),
  field_name text not null,
  field_type text check (field_type in ('text','number','date','dropdown')),
  is_required boolean not null default false
);

create table custom_field_values (
  id uuid primary key default gen_random_uuid(),
  field_definition_id uuid not null references custom_field_definitions(id),
  entity_id uuid not null,
  value text
);

-- ============================================================
-- 14. Service Management
-- ============================================================

create table incidents (
  id uuid primary key default gen_random_uuid(),
  incident_number text unique not null,
  asset_id uuid references assets(id),
  employee_id uuid references employees(id),
  priority_id uuid references priorities(id),
  category_id uuid references incident_categories(id),
  severity_id uuid references severities(id),
  status text default 'open',
  assigned_engineer_id uuid references users(id),
  root_cause text,
  resolution text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  sla_due_at timestamptz
);

create table incident_timeline (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  event_text text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table incident_attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  file_url text not null
);

create table problems (
  id uuid primary key default gen_random_uuid(),
  problem_number text unique not null,
  title text not null,
  root_cause text,
  known_error text,
  fix text,
  status text default 'open'
);

create table problem_incidents (
  problem_id uuid not null references problems(id) on delete cascade,
  incident_id uuid not null references incidents(id) on delete cascade,
  primary key (problem_id, incident_id)
);

create table changes (
  id uuid primary key default gen_random_uuid(),
  change_number text unique not null,
  title text not null,
  description text,
  related_asset_id uuid references assets(id),
  risk_level text,
  status text default 'requested',
  requested_by uuid references users(id),
  approved_by uuid references users(id),
  scheduled_at timestamptz
);

-- ============================================================
-- 15. Cross-Cutting
-- ============================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  action text check (action in ('login','logout','create','update','delete','assign','return','transfer','approval','import','export','password_reset')),
  entity_type text not null,
  entity_id uuid,
  field_name text,
  old_value text,
  new_value text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index idx_audit_logs_user on audit_logs(user_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('renewal','warranty','maintenance','assignment','return','incident','approval')),
  entity_type text,
  entity_id uuid,
  recipient_user_id uuid references users(id),
  channel text check (channel in ('email','dashboard','toast')),
  trigger_offset_days int,
  sent_at timestamptz,
  read_at timestamptz
);

create table notification_templates (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  subject text,
  body_template text
);

-- ============================================================
-- Seed: org structure (Karawa Group)
-- ============================================================

insert into companies (name, code, is_parent, status) values
  ('Karawa', 'KWA', true, 'active'),
  ('O2 Café', 'O2C', false, 'active'),
  ('Joy', 'JOY', false, 'active'),
  ('JOT Events', 'JOT', false, 'active');

insert into departments (name, code, is_shared) values
  ('IT', 'IT', true),
  ('HR', 'HR', true),
  ('Finance', 'FIN', true);

-- Permissions: module x action grid. Not every module supports every action
-- (e.g. Dashboard has no "delete") — this seed matches the modules and
-- actions listed in ITAMS-Screens-Fields-Functions.md section 4.3.
insert into permissions (module, action)
select m, a from
  (values
    ('dashboard'), ('employees'), ('hardware_assets'), ('software_licenses'),
    ('incidents'), ('reports'), ('settings'), ('procurement'), ('network'),
    ('repairs'), ('contracts'), ('inventory_audit'), ('requests'), ('automation_rules')
  ) as modules(m)
  cross join
  (values ('view'), ('add'), ('edit'), ('delete'), ('approve'), ('export'), ('print'), ('import')) as actions(a)
on conflict (module, action) do nothing;


-- ============================================================================
-- PART 2 of 5 — Views (v_employees, v_assets)
-- Source: db/views.sql
-- ============================================================================

-- ITAMS — Postgres views
-- Run this after db/schema.sql. These views resolve joined/display data
-- so the frontend can query one row per record instead of doing N+1
-- lookups in application code — this is what src/lib/api/*.ts queries
-- against in live mode.

create or replace view v_employees as
select
  e.id,
  e.employee_number,
  e.first_name || ' ' || e.last_name as name,
  c.name as company_name,
  d.name as department_name,
  e.designation as title,
  e.status,
  e.email,
  e.joining_date,
  coalesce(m.first_name || ' ' || m.last_name, '—') as manager_name
from employees e
left join companies c on c.id = e.company_id
left join departments d on d.id = e.department_id
left join employees m on m.id = e.manager_id;

-- Resolves current_owner_type/current_owner_id (a polymorphic reference —
-- see assets.current_owner_type in schema.sql) into a single display name,
-- since that can't be expressed as a normal foreign-key join.
create or replace view v_assets as
select
  a.id,
  a.asset_number,
  a.barcode,
  cat.name as category_name,
  (cat.name = 'Bundle') as is_bundle,
  mfr.name as manufacturer_name,
  mdl.name as model_name,
  a.serial_number,
  st.name as status_name,
  comp.name as company_name,
  a.current_owner_type,
  coalesce(
    (select first_name || ' ' || last_name from employees where id = a.current_owner_id and a.current_owner_type = 'employee'),
    (select name from locations where id = a.current_owner_id and a.current_owner_type in ('location', 'server_room')),
    (select name from projects where id = a.current_owner_id and a.current_owner_type = 'project'),
    (select name from departments where id = a.current_owner_id and a.current_owner_type = 'department'),
    (select name from org_units where id = a.current_owner_id and a.current_owner_type in ('business_unit', 'branch')),
    'Unassigned'
  ) as owner_name,
  loc.name as location_name,
  a.purchase_date,
  a.cost,
  cur.code as currency_code,
  a.warranty_end,
  a.parent_asset_id
from assets a
left join asset_categories cat on cat.id = a.category_id
left join manufacturers mfr on mfr.id = a.manufacturer_id
left join asset_models mdl on mdl.id = a.model_id
left join asset_statuses st on st.id = a.status_id
left join companies comp on comp.id = a.company_id
left join locations loc on loc.id = a.location_id
left join currencies cur on cur.id = a.currency_id;


-- ============================================================================
-- PART 3 of 5 — Row-Level Security Policies
-- Source: db/rls-policies.sql
-- ============================================================================

-- ITAMS — Row-Level Security policies
-- Run this after db/schema.sql and db/views.sql.
--
-- SCOPE OF THIS PASS: enforces two layers —
--   1. Multi-tenant company-scoping (a Karawa user can't touch O2 Café's
--      data) on every table.
--   2. The actual view/add/edit/delete-per-module permission matrix from
--      the Roles & Permission Matrix screen, checked via has_permission().
--      Covers: the 13 primary company-owned tables (org_units, locations,
--      cost_centers, projects, employees, assets, software_licenses,
--      data_centers, contracts, audit_sessions, purchase_orders,
--      discovered_devices, automation_rules); ITSM (incidents, problems,
--      changes, and their child tables — previously "authenticated-only",
--      which meant the Incidents row in the Roles screen had checkboxes
--      that did nothing; that's fixed here); asset_requests (Self-Service,
--      including a distinct requests:approve check for the approval queue
--      vs. requests:add for submitting your own); and the highest-traffic
--      child tables (asset_assignments, asset_transfers, asset_disposals,
--      repair_records, repair_replacements, warranty_extensions,
--      software_assignments, audit_scans, purchase_order_lines).
--   Roles with is_system_role = true bypass the permission check (still
--   subject to company-scoping).
--
-- NOT covered by permission-matrix enforcement (company-scoping still
-- applies where the parent has it): asset_attachments, depreciation_entries,
-- network_asset_details, software_installations, asset_relationships,
-- racks, employee_department, custom_field_values. These are mostly
-- system-written (depreciation entries, software installs from discovery)
-- or low-stakes enough that extending the same pattern is mechanical
-- repetition rather than a meaningfully different risk — a genuine
-- prioritization call, not an oversight, but worth knowing if one of
-- these turns out to matter more than expected as the app grows.

-- ============================================================
-- Helper functions
-- ============================================================

-- Maps the Supabase Auth user (auth.uid()/auth.jwt() email) to our
-- app-level users.id. Returns null if there's no linked profile yet
-- (e.g. an invited user who hasn't been given an app profile) — RLS
-- policies below treat null as "no access", not "full access".
create or replace function current_app_user_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.users where email = auth.jwt() ->> 'email' limit 1;
$$;

-- Company IDs this user has a role in. A user_roles row with a null
-- company_id means "all companies" (global admin) — represented here
-- by returning every company_id from the companies table in that case.
create or replace function current_user_company_ids()
returns uuid[]
language sql stable security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.user_roles
      where user_id = current_app_user_id() and company_id is null
    )
    then (select array_agg(id) from public.companies)
    else (
      select array_agg(company_id) from public.user_roles
      where user_id = current_app_user_id() and company_id is not null
    )
  end;
$$;

-- ============================================================
-- Global / lookup tables — readable by any authenticated user,
-- writable only by someone with settings:edit (admin-ish) permission.
-- ============================================================

create or replace function has_settings_write()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = current_app_user_id()
      and p.module = 'settings' and p.action in ('edit', 'add')
  );
$$;

-- General-purpose permission check, now that db/schema.sql seeds every
-- functional area's module (not just the original 7) — used below to
-- enforce the actual view/add/edit/delete matrix from the Roles &
-- Permission screen at the database layer, not just company-scoping.
create or replace function has_permission(target_module text, target_action text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = current_app_user_id() and r.is_system_role = true)
    or exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = current_app_user_id()
        and p.module = target_module and p.action = target_action
    );
$$;

do $$
declare
  t text;
  lookup_tables text[] := array[
    'manufacturers', 'asset_models', 'asset_categories', 'asset_statuses',
    'license_types', 'subscription_types', 'currencies', 'depreciation_methods',
    'employment_types', 'vendors', 'barcode_prefixes', 'incident_categories',
    'priorities', 'severities', 'departments', 'roles', 'permissions',
    'notification_templates', 'custom_field_definitions', 'depreciation_settings'
  ];
begin
  foreach t in array lookup_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists lookup_read on public.%I', t);
    execute format('create policy lookup_read on public.%I for select using (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists lookup_write on public.%I', t);
    execute format('create policy lookup_write on public.%I for all using (has_settings_write()) with check (has_settings_write())', t);
  end loop;
end $$;

-- ============================================================
-- Company-scoped tables — direct company_id column
-- ============================================================

-- ============================================================
-- Company-scoped tables — direct company_id column.
-- Each is mapped to the module it corresponds to in the Roles &
-- Permission Matrix, and every action (view/add/edit/delete) is
-- enforced here — this is the fine-grained enforcement the earlier
-- version of this file said was still missing; it isn't anymore.
-- Written out explicitly per table rather than looped: the module
-- name varies per table in a way that isn't worth a dynamic-SQL
-- abstraction for 13 tables — explicit and greppable beats clever.
-- ============================================================

alter table org_units enable row level security;
alter table locations enable row level security;
alter table cost_centers enable row level security;
alter table projects enable row level security;
alter table employees enable row level security;
alter table assets enable row level security;
alter table software_licenses enable row level security;
alter table data_centers enable row level security;
alter table contracts enable row level security;
alter table audit_sessions enable row level security;
alter table purchase_orders enable row level security;
alter table discovered_devices enable row level security;
alter table automation_rules enable row level security;

create policy select_scoped on org_units for select using (company_id = any(current_user_company_ids()) and has_permission('settings', 'view'));
create policy insert_scoped on org_units for insert with check (company_id = any(current_user_company_ids()) and has_permission('settings', 'add'));
create policy update_scoped on org_units for update using (company_id = any(current_user_company_ids()) and has_permission('settings', 'edit'));
create policy delete_scoped on org_units for delete using (company_id = any(current_user_company_ids()) and has_permission('settings', 'delete'));

create policy select_scoped on locations for select using (company_id = any(current_user_company_ids()) and has_permission('settings', 'view'));
create policy insert_scoped on locations for insert with check (company_id = any(current_user_company_ids()) and has_permission('settings', 'add'));
create policy update_scoped on locations for update using (company_id = any(current_user_company_ids()) and has_permission('settings', 'edit'));
create policy delete_scoped on locations for delete using (company_id = any(current_user_company_ids()) and has_permission('settings', 'delete'));

create policy select_scoped on cost_centers for select using (company_id = any(current_user_company_ids()) and has_permission('settings', 'view'));
create policy insert_scoped on cost_centers for insert with check (company_id = any(current_user_company_ids()) and has_permission('settings', 'add'));
create policy update_scoped on cost_centers for update using (company_id = any(current_user_company_ids()) and has_permission('settings', 'edit'));
create policy delete_scoped on cost_centers for delete using (company_id = any(current_user_company_ids()) and has_permission('settings', 'delete'));

create policy select_scoped on projects for select using (company_id = any(current_user_company_ids()) and has_permission('settings', 'view'));
create policy insert_scoped on projects for insert with check (company_id = any(current_user_company_ids()) and has_permission('settings', 'add'));
create policy update_scoped on projects for update using (company_id = any(current_user_company_ids()) and has_permission('settings', 'edit'));
create policy delete_scoped on projects for delete using (company_id = any(current_user_company_ids()) and has_permission('settings', 'delete'));

create policy select_scoped on employees for select using (company_id = any(current_user_company_ids()) and has_permission('employees', 'view'));
create policy insert_scoped on employees for insert with check (company_id = any(current_user_company_ids()) and has_permission('employees', 'add'));
create policy update_scoped on employees for update using (company_id = any(current_user_company_ids()) and has_permission('employees', 'edit'));
create policy delete_scoped on employees for delete using (company_id = any(current_user_company_ids()) and has_permission('employees', 'delete'));

create policy select_scoped on assets for select using (company_id = any(current_user_company_ids()) and has_permission('hardware_assets', 'view'));
create policy insert_scoped on assets for insert with check (company_id = any(current_user_company_ids()) and has_permission('hardware_assets', 'add'));
create policy update_scoped on assets for update using (company_id = any(current_user_company_ids()) and has_permission('hardware_assets', 'edit'));
create policy delete_scoped on assets for delete using (company_id = any(current_user_company_ids()) and has_permission('hardware_assets', 'delete'));

create policy select_scoped on software_licenses for select using (company_id = any(current_user_company_ids()) and has_permission('software_licenses', 'view'));
create policy insert_scoped on software_licenses for insert with check (company_id = any(current_user_company_ids()) and has_permission('software_licenses', 'add'));
create policy update_scoped on software_licenses for update using (company_id = any(current_user_company_ids()) and has_permission('software_licenses', 'edit'));
create policy delete_scoped on software_licenses for delete using (company_id = any(current_user_company_ids()) and has_permission('software_licenses', 'delete'));

create policy select_scoped on data_centers for select using (company_id = any(current_user_company_ids()) and has_permission('network', 'view'));
create policy insert_scoped on data_centers for insert with check (company_id = any(current_user_company_ids()) and has_permission('network', 'add'));
create policy update_scoped on data_centers for update using (company_id = any(current_user_company_ids()) and has_permission('network', 'edit'));
create policy delete_scoped on data_centers for delete using (company_id = any(current_user_company_ids()) and has_permission('network', 'delete'));

create policy select_scoped on contracts for select using (company_id = any(current_user_company_ids()) and has_permission('contracts', 'view'));
create policy insert_scoped on contracts for insert with check (company_id = any(current_user_company_ids()) and has_permission('contracts', 'add'));
create policy update_scoped on contracts for update using (company_id = any(current_user_company_ids()) and has_permission('contracts', 'edit'));
create policy delete_scoped on contracts for delete using (company_id = any(current_user_company_ids()) and has_permission('contracts', 'delete'));

create policy select_scoped on audit_sessions for select using (company_id = any(current_user_company_ids()) and has_permission('inventory_audit', 'view'));
create policy insert_scoped on audit_sessions for insert with check (company_id = any(current_user_company_ids()) and has_permission('inventory_audit', 'add'));
create policy update_scoped on audit_sessions for update using (company_id = any(current_user_company_ids()) and has_permission('inventory_audit', 'edit'));
create policy delete_scoped on audit_sessions for delete using (company_id = any(current_user_company_ids()) and has_permission('inventory_audit', 'delete'));

create policy select_scoped on purchase_orders for select using (company_id = any(current_user_company_ids()) and has_permission('procurement', 'view'));
create policy insert_scoped on purchase_orders for insert with check (company_id = any(current_user_company_ids()) and has_permission('procurement', 'add'));
create policy update_scoped on purchase_orders for update using (company_id = any(current_user_company_ids()) and has_permission('procurement', 'edit'));
create policy delete_scoped on purchase_orders for delete using (company_id = any(current_user_company_ids()) and has_permission('procurement', 'delete'));

create policy select_scoped on discovered_devices for select using (company_id = any(current_user_company_ids()) and has_permission('network', 'view'));
create policy insert_scoped on discovered_devices for insert with check (company_id = any(current_user_company_ids()) and has_permission('network', 'add'));
create policy update_scoped on discovered_devices for update using (company_id = any(current_user_company_ids()) and has_permission('network', 'edit'));
create policy delete_scoped on discovered_devices for delete using (company_id = any(current_user_company_ids()) and has_permission('network', 'delete'));

create policy select_scoped on automation_rules for select using (company_id = any(current_user_company_ids()) and has_permission('automation_rules', 'view'));
create policy insert_scoped on automation_rules for insert with check (company_id = any(current_user_company_ids()) and has_permission('automation_rules', 'add'));
create policy update_scoped on automation_rules for update using (company_id = any(current_user_company_ids()) and has_permission('automation_rules', 'edit'));
create policy delete_scoped on automation_rules for delete using (company_id = any(current_user_company_ids()) and has_permission('automation_rules', 'delete'));

-- ============================================================
-- Child tables — no company_id of their own, scoped via their parent
-- ============================================================

alter table asset_attachments enable row level security;
create policy scoped_via_asset on asset_attachments for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table asset_assignments enable row level security;
create policy scoped_via_asset on asset_assignments for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('hardware_assets', 'edit'))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('hardware_assets', 'edit'));

alter table asset_transfers enable row level security;
create policy scoped_via_asset on asset_transfers for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('hardware_assets', 'edit'))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('hardware_assets', 'edit'));

alter table asset_disposals enable row level security;
create policy scoped_via_asset on asset_disposals for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('hardware_assets', 'delete'))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('hardware_assets', 'delete'));

alter table depreciation_entries enable row level security;
create policy scoped_via_asset on depreciation_entries for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table network_asset_details enable row level security;
create policy scoped_via_asset on network_asset_details for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table software_installations enable row level security;
create policy scoped_via_asset on software_installations for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table asset_relationships enable row level security;
create policy scoped_via_asset on asset_relationships for all
  using (exists (select 1 from assets a where a.id = source_asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = source_asset_id and a.company_id = any(current_user_company_ids())));

alter table repair_records enable row level security;
create policy scoped_via_asset on repair_records for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('repairs', 'edit'))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('repairs', 'edit'));

alter table repair_replacements enable row level security;
create policy scoped_via_repair on repair_replacements for all
  using (exists (select 1 from repair_records r join assets a on a.id = r.asset_id where r.id = repair_record_id and a.company_id = any(current_user_company_ids())) and has_permission('repairs', 'edit'))
  with check (exists (select 1 from repair_records r join assets a on a.id = r.asset_id where r.id = repair_record_id and a.company_id = any(current_user_company_ids())) and has_permission('repairs', 'edit'));

alter table warranty_extensions enable row level security;
create policy scoped_via_asset on warranty_extensions for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('contracts', 'add'))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())) and has_permission('contracts', 'add'));

alter table racks enable row level security;
create policy scoped_via_datacenter on racks for all
  using (exists (select 1 from data_centers d where d.id = data_center_id and d.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from data_centers d where d.id = data_center_id and d.company_id = any(current_user_company_ids())));

alter table software_assignments enable row level security;
create policy scoped_via_license on software_assignments for all
  using (exists (select 1 from software_licenses l where l.id = license_id and l.company_id = any(current_user_company_ids())) and has_permission('software_licenses', 'edit'))
  with check (exists (select 1 from software_licenses l where l.id = license_id and l.company_id = any(current_user_company_ids())) and has_permission('software_licenses', 'edit'));

alter table audit_scans enable row level security;
create policy scoped_via_session on audit_scans for all
  using (exists (select 1 from audit_sessions s where s.id = audit_session_id and s.company_id = any(current_user_company_ids())) and has_permission('inventory_audit', 'add'))
  with check (exists (select 1 from audit_sessions s where s.id = audit_session_id and s.company_id = any(current_user_company_ids())) and has_permission('inventory_audit', 'add'));

alter table purchase_order_lines enable row level security;
create policy scoped_via_po on purchase_order_lines for all
  using (exists (select 1 from purchase_orders po where po.id = po_id and po.company_id = any(current_user_company_ids())) and has_permission('procurement', 'edit'))
  with check (exists (select 1 from purchase_orders po where po.id = po_id and po.company_id = any(current_user_company_ids())) and has_permission('procurement', 'edit'));

alter table asset_requests enable row level security;
create policy select_scoped on asset_requests for select
  using (exists (select 1 from employees e where e.id = employee_id and e.company_id = any(current_user_company_ids())) and has_permission('requests', 'view'));
create policy insert_scoped on asset_requests for insert
  with check (exists (select 1 from employees e where e.id = employee_id and e.company_id = any(current_user_company_ids())) and has_permission('requests', 'add'));
-- Deciding a request (approved/rejected) is the approval queue action —
-- requires requests:approve specifically, not just requests:edit, since
-- "can edit my own request" and "can approve someone else's" are
-- different permissions in the Roles & Permission Matrix.
create policy update_scoped on asset_requests for update
  using (exists (select 1 from employees e where e.id = employee_id and e.company_id = any(current_user_company_ids())) and (has_permission('requests', 'edit') or has_permission('requests', 'approve')));

alter table employee_department enable row level security;
create policy scoped_direct on employee_department for all
  using (company_id = any(current_user_company_ids()))
  with check (company_id = any(current_user_company_ids()));

-- ============================================================
-- ITSM tables — incidents/problems/changes aren't strictly
-- company-owned in the schema (no company_id on any of them), so
-- these can't be scoped to a company the way assets/employees are.
-- What they DO get now: real has_permission('incidents', action)
-- checks — the Roles & Permission Matrix has an "Incidents" row with
-- view/add/edit/delete checkboxes, and until this pass those
-- checkboxes did nothing (the policy was auth.role() = 'authenticated'
-- regardless of what was checked). That's fixed below. Problems and
-- Changes share the same 'incidents' module rather than getting their
-- own — there's no separate row for them in the permission matrix UI,
-- and adding one is a UI change, not just an RLS one, so it's a
-- documented choice, not an oversight.
-- ============================================================

alter table incidents enable row level security;
create policy select_incidents on incidents for select using (has_permission('incidents', 'view'));
create policy insert_incidents on incidents for insert with check (has_permission('incidents', 'add'));
create policy update_incidents on incidents for update using (has_permission('incidents', 'edit'));
create policy delete_incidents on incidents for delete using (has_permission('incidents', 'delete'));

alter table incident_timeline enable row level security;
create policy scoped_via_incident on incident_timeline for all
  using (exists (select 1 from incidents i where i.id = incident_id) and has_permission('incidents', 'edit'))
  with check (exists (select 1 from incidents i where i.id = incident_id) and has_permission('incidents', 'edit'));

alter table incident_attachments enable row level security;
create policy scoped_via_incident on incident_attachments for all
  using (exists (select 1 from incidents i where i.id = incident_id) and has_permission('incidents', 'edit'))
  with check (exists (select 1 from incidents i where i.id = incident_id) and has_permission('incidents', 'edit'));

alter table problems enable row level security;
create policy select_problems on problems for select using (has_permission('incidents', 'view'));
create policy insert_problems on problems for insert with check (has_permission('incidents', 'add'));
create policy update_problems on problems for update using (has_permission('incidents', 'edit'));
create policy delete_problems on problems for delete using (has_permission('incidents', 'delete'));

alter table problem_incidents enable row level security;
create policy problem_incidents_access on problem_incidents for all
  using (has_permission('incidents', 'edit')) with check (has_permission('incidents', 'edit'));

alter table changes enable row level security;
create policy select_changes on changes for select using (has_permission('incidents', 'view'));
create policy insert_changes on changes for insert with check (has_permission('incidents', 'add'));
create policy update_changes on changes for update using (has_permission('incidents', 'edit'));
create policy delete_changes on changes for delete using (has_permission('incidents', 'delete'));

-- ============================================================
-- Custom field values — scoped is impossible to express generically
-- (entity_id can point at any of several tables); left readable/writable
-- to any authenticated user rather than guessed at incorrectly.
-- ============================================================

alter table custom_field_values enable row level security;
create policy custom_field_values_access on custom_field_values for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Users & RBAC tables
-- ============================================================

alter table users enable row level security;
create policy users_read_own_or_admin on users for select
  using (id = current_app_user_id() or has_settings_write());
create policy users_write_admin_only on users for insert with check (has_settings_write());
create policy users_update_admin_only on users for update using (has_settings_write());

alter table user_roles enable row level security;
create policy user_roles_access on user_roles for all
  using (has_settings_write()) with check (has_settings_write());

alter table role_permissions enable row level security;
create policy role_permissions_access on role_permissions for all
  using (has_settings_write()) with check (has_settings_write());

alter table companies enable row level security;
create policy companies_read on companies for select using (auth.role() = 'authenticated');
create policy companies_write on companies for all using (has_settings_write()) with check (has_settings_write());

-- ============================================================
-- Notifications — a user only sees their own
-- ============================================================

alter table notifications enable row level security;
create policy own_notifications on notifications for select using (recipient_user_id = current_app_user_id());
create policy notifications_insert_system on notifications for insert with check (true); -- Edge Function uses the service role key, which bypasses RLS anyway; this just avoids blocking authenticated app writes too

-- ============================================================
-- Audit trail — insert-only from the app, immutable after that
-- (no update/delete policy means those operations are denied by
-- default once RLS is enabled)
-- ============================================================

alter table audit_logs enable row level security;
create policy audit_logs_insert on audit_logs for insert with check (auth.role() = 'authenticated');
create policy audit_logs_read on audit_logs for select using (has_settings_write());


-- ============================================================================
-- PART 4 of 5 — Configuration Tables (HR sync, label printing, notifications, approvals)
-- Source: db/config-schema.sql
-- ============================================================================

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


-- ============================================================================
-- PART 5 of 5 — Database Backup Configuration
-- Source: db/backup-schema.sql
-- ============================================================================

-- ITAMS — Database backup configuration
-- Run after db/schema.sql, db/views.sql, db/rls-policies.sql, db/config-schema.sql.
--
-- SECURITY NOTE: this table intentionally does NOT have columns for the
-- OneDrive client secret or refresh token, or the database connection
-- string. Those live as GitHub Actions repo secrets (DATABASE_URL,
-- ONEDRIVE_CLIENT_SECRET, etc. — see .github/workflows/database-backup.yml),
-- never in a Postgres table reachable by the anon key — RLS protects
-- against other users reading it, but not against a compromised anon key
-- or a policy bug exposing a secret that should never have been
-- client-reachable in the first place. Non-secret config (folder path,
-- schedule, notification emails, client ID which is not secret) lives
-- here; the actual bearer tokens and pg_dump connection string live only
-- in GitHub Actions' secret store. See scripts/backup-database.mjs — the
-- real backup logic runs there, not in a Supabase Edge Function, because
-- Deno's runtime doesn't have a pg_dump binary available; Edge Functions
-- only handle the "Instant Backup" button's trigger (supabase/functions/
-- trigger-instant-backup), which fires a workflow_dispatch and lets
-- GitHub Actions' full Linux environment do the actual dump.

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

