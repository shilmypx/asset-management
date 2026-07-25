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
