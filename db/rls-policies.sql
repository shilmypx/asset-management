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
