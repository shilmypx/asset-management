-- ITAMS — Row-Level Security policies
-- Run this after db/schema.sql and db/views.sql.
--
-- SCOPE OF THIS PASS: this enforces the multi-tenant boundary — a user
-- assigned to Karawa can't read or write O2 Café's data, and vice versa —
-- which is the security property that actually matters most (data leaking
-- across companies). It does NOT yet enforce the fine-grained module/action
-- matrix from the Roles & Permission Matrix screen (view/add/edit/delete
-- per module) at the database layer; that's still enforced in the UI only
-- (buttons disabled per permission) rather than at the RLS layer. Doing
-- that properly would mean expanding the `permissions` table's module list
-- to cover every functional area (procurement, repairs, contracts, audit,
-- etc. — currently seeded with only 7 of them, see db/schema.sql), which
-- is a real design decision, not something to bolt on silently here.
-- Company-scoping is the boundary every table gets today; permission-level
-- write enforcement is a documented follow-up, not a silent gap.

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

do $$
declare
  t text;
  company_scoped_tables text[] := array[
    'org_units', 'locations', 'cost_centers', 'employees', 'projects',
    'assets', 'software_licenses', 'data_centers', 'contracts',
    'audit_sessions', 'purchase_orders', 'discovered_devices',
    'automation_rules'
  ];
begin
  foreach t in array company_scoped_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists company_scoped on public.%I', t);
    execute format(
      'create policy company_scoped on public.%I for all using (company_id = any(current_user_company_ids())) with check (company_id = any(current_user_company_ids()))',
      t
    );
  end loop;
end $$;

-- ============================================================
-- Child tables — no company_id of their own, scoped via their parent
-- ============================================================

alter table asset_attachments enable row level security;
create policy scoped_via_asset on asset_attachments for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table asset_assignments enable row level security;
create policy scoped_via_asset on asset_assignments for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table asset_transfers enable row level security;
create policy scoped_via_asset on asset_transfers for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table asset_disposals enable row level security;
create policy scoped_via_asset on asset_disposals for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

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
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table repair_replacements enable row level security;
create policy scoped_via_repair on repair_replacements for all
  using (exists (select 1 from repair_records r join assets a on a.id = r.asset_id where r.id = repair_record_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from repair_records r join assets a on a.id = r.asset_id where r.id = repair_record_id and a.company_id = any(current_user_company_ids())));

alter table warranty_extensions enable row level security;
create policy scoped_via_asset on warranty_extensions for all
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from assets a where a.id = asset_id and a.company_id = any(current_user_company_ids())));

alter table racks enable row level security;
create policy scoped_via_datacenter on racks for all
  using (exists (select 1 from data_centers d where d.id = data_center_id and d.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from data_centers d where d.id = data_center_id and d.company_id = any(current_user_company_ids())));

alter table software_assignments enable row level security;
create policy scoped_via_license on software_assignments for all
  using (exists (select 1 from software_licenses l where l.id = license_id and l.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from software_licenses l where l.id = license_id and l.company_id = any(current_user_company_ids())));

alter table audit_scans enable row level security;
create policy scoped_via_session on audit_scans for all
  using (exists (select 1 from audit_sessions s where s.id = audit_session_id and s.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from audit_sessions s where s.id = audit_session_id and s.company_id = any(current_user_company_ids())));

alter table purchase_order_lines enable row level security;
create policy scoped_via_po on purchase_order_lines for all
  using (exists (select 1 from purchase_orders po where po.id = po_id and po.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from purchase_orders po where po.id = po_id and po.company_id = any(current_user_company_ids())));

alter table asset_requests enable row level security;
create policy scoped_via_employee on asset_requests for all
  using (exists (select 1 from employees e where e.id = employee_id and e.company_id = any(current_user_company_ids())))
  with check (exists (select 1 from employees e where e.id = employee_id and e.company_id = any(current_user_company_ids())));

alter table employee_department enable row level security;
create policy scoped_direct on employee_department for all
  using (company_id = any(current_user_company_ids()))
  with check (company_id = any(current_user_company_ids()));

-- ============================================================
-- ITSM tables — incidents/problems/changes aren't strictly
-- company-owned in the schema (no company_id), so these are scoped
-- via the related employee/asset where present, and otherwise open
-- to any authenticated user with incidents:view — narrower scoping
-- would need a company_id added to these tables, which is a schema
-- change, not an RLS-only fix.
-- ============================================================

alter table incidents enable row level security;
create policy incidents_access on incidents for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table incident_timeline enable row level security;
create policy scoped_via_incident on incident_timeline for all
  using (exists (select 1 from incidents i where i.id = incident_id))
  with check (exists (select 1 from incidents i where i.id = incident_id));

alter table incident_attachments enable row level security;
create policy scoped_via_incident on incident_attachments for all
  using (exists (select 1 from incidents i where i.id = incident_id))
  with check (exists (select 1 from incidents i where i.id = incident_id));

alter table problems enable row level security;
create policy problems_access on problems for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table problem_incidents enable row level security;
create policy problem_incidents_access on problem_incidents for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table changes enable row level security;
create policy changes_access on changes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

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
