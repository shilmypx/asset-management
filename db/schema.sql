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
