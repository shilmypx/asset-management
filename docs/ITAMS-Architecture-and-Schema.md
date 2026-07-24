# Enterprise IT Asset Management System (ITAMS)
## Architecture & Database Schema — v1

---

## 1. Organization Model

The whole system hangs off one hierarchy. Get this right and every module (assets, employees, RBAC, reports) just filters against it.

```
Karawa (Parent Company)
├── Shared Departments: IT, HR, Finance   (visible/used across ALL companies)
│
├── O2 Café (Sister Company)
│   └── Branches: Branch 1, Branch 2, Branch 3, ... Branch N
│
├── Joy (Sister Company)
│   └── Business Units: Acronis, Designing, Crafting
│       └── Each Business Unit → Divisions: Sales & Administration, Operations, Delivery
│
└── JOT Events (Sister Company)
    └── Business Units: Acronis, Designing, Crafting
        └── Each Business Unit → Divisions: Sales & Administration, Operations, Delivery
```

Key design decision: **companies have different org shapes** (O2 Café uses Branches, Joy/JOT use Business Units → Divisions). Rather than hard-coding this, the schema uses a generic **Org Unit** tree per company (self-referencing parent_id), so the same tables/UI serve all shapes without special-casing. Departments (IT/HR/Finance) are modeled as a separate shared dimension since they cut across every company.

---

## 2. Competitive Gap Analysis — ServiceNow / Zoho (ManageEngine AssetExplorer) / Jira Service Management Assets

| Capability | Seen in | Added? | Notes |
|---|---|---|---|
| Network auto-discovery (agent/agentless scan, staged reconciliation) | ServiceNow, AssetExplorer | ✅ Schema added (4.10) | Full scanning agent is a later-phase build; schema supports it now so it's not a rework later |
| Software usage metering & unauthorized-install detection | AssetExplorer | ✅ Schema added (4.10) | Installed-vs-licensed comparison, not just seat counts |
| Purchase Order / procurement workflow | AssetExplorer | ✅ Schema added (4.9) | Closes the gap between "request" and "asset exists" |
| Employee self-service requests (hardware/software) | Zoho | ✅ Schema added (4.11) | Was entirely admin-driven before |
| Automation rules engine (trigger → action) | ServiceNow | ✅ Schema added (4.12) | Makes lifecycle triggers (warranty/contract/repair) admin-configurable instead of hardcoded |
| Admin-definable custom fields per category | Jira Assets | ✅ Schema added (4.13), lighter-weight | Full free-form object-type schema builder (Jira's approach) is overkill at our scale — scoped to existing entities instead |
| CI relationship graph visualization | ServiceNow, Jira Assets | Already in scope | `asset_relationships` (4.5) has the data; needs a graph UI view — flagged for the dashboard/reports build phase |
| Cloud asset & cost management (FinOps) | ServiceNow | Out of scope for now | Relevant if/when the group runs meaningful cloud infrastructure spend; not indicated by current requirements |
| Full agent-based remote control of endpoints | AssetExplorer (via ManageEngine suite) | Out of scope | Separate product category (RMM), not core ITAM |
| Generative/agentic AI recommendations | ServiceNow | Out of scope for v1 | Worth revisiting once there's enough historical data (repair costs, usage patterns) for it to be useful rather than gimmicky |

---

## 3. Module List (build order)

| Phase | Module | Depends on |
|---|---|---|
| 1 | System Administration (companies, org units, departments, lookups) | — |
| 1 | User Management & RBAC | System Admin |
| 1 | Employee Management | System Admin |
| 2 | Procurement (requests → PO → receipt → asset creation) | Employees, System Admin |
| 2 | Hardware Asset Management (incl. bundles, barcode/QR) | Employees, System Admin |
| 2 | Check-Out / Check-In / Transfer / Disposal screens | Hardware Assets |
| 2 | Employee Self-Service Portal (requests, my assets) | Hardware Assets, Employees |
| 3 | Software & SaaS License Management | Employees, Assets |
| 3 | Network Components + Relationship Mapping | Hardware Assets |
| 3 | Discovery & Reconciliation (scan → stage → match to assets) | Hardware Assets, Network |
| 3 | Software Usage Metering & Compliance | Discovery, Software Licenses |
| 4 | Incident / Problem / Change Management | Assets, Employees |
| 4 | Repair & Maintenance (incl. temporary replacement workflow) | Hardware Assets |
| 4 | Contracts, Warranty & Renewal Notifications | Software, Assets |
| 5 | Depreciation Engine | Assets |
| 5 | Inventory Audit (barcode reconciliation) | Hardware Assets |
| 5 | Automation Rules Engine | all lifecycle modules |
| 5 | Audit Trail (cross-cutting, actually built alongside every module above) | all |
| 6 | Dashboard & Reports (incl. relationship graph view) | all |
| 6 | Barcode Printing | Assets |

---

## 4. Database Schema (relational, e.g. Postgres)

### 4.1 Organization & Admin

**companies**
- id (PK), name, code, is_parent (bool), parent_company_id (FK → companies, nullable — links sister companies to Karawa conceptually if needed), logo_url, address, status, created_at

**org_units** *(generic tree: covers Branches, Business Units, Divisions in one structure)*
- id (PK), company_id (FK), parent_org_unit_id (FK → org_units, nullable), name, type (enum: `branch`, `business_unit`, `division`), sort_order, status

**departments** *(shared dimension: IT, HR, Finance — not tied to one company)*
- id (PK), name, code, is_shared (bool)

**employee_department** *(junction — an employee's department can be shared across companies)*
- employee_id, department_id, company_id

**locations**
- id (PK), company_id (FK), org_unit_id (FK, nullable), name, address, type (office/branch/server_room/warehouse)

**cost_centers**
- id (PK), company_id (FK), name, code

**lookup tables** (all admin-configurable dropdowns, same shape: id, name, code, sort_order, is_active)
- manufacturers, asset_models (FK → manufacturer), asset_categories (with `allow_depreciation` bool flag per category), asset_statuses, license_types, subscription_types, currencies, depreciation_methods, employment_types, barcode_prefixes (scoped per company/category)

### 4.2 People & Access

**employees**
- id (PK), employee_number, first_name, last_name, email, phone, designation, department_id (FK), company_id (FK), org_unit_id (FK, nullable), branch/location_id (FK), manager_id (FK → employees, self-ref), employment_type_id (FK), joining_date, status (active/inactive/resigned), created_at

**users** *(system login accounts — 1:1 or 0:1 with employees; some system users may not be employees, e.g. service accounts)*
- id (PK), employee_id (FK, nullable), username, email, password_hash, mfa_enabled, is_locked, failed_attempts, last_login_at, status

**roles**
- id (PK), name, description, is_system_role (bool)

**permissions**
- id (PK), module (dashboard/employees/assets/hardware/software/incidents/reports/settings/...), action (view/add/edit/delete/approve/export/print/import)

**role_permissions**
- role_id (FK), permission_id (FK)  → composite PK

**user_roles**
- user_id (FK), role_id (FK), company_id (FK, nullable — supports role scoped to one company)

### 4.3 Assets — Hardware

**assets**
- id (PK), asset_number (unique, barcode-derived), barcode, qr_code, category_id (FK), manufacturer_id (FK), model_id (FK), serial_number, company_id (FK), org_unit_id (FK, nullable), department_id (FK, nullable), location_id (FK), current_owner_type (enum: employee/department/business_unit/location/server_room/branch/project/shared_pool), current_owner_id (polymorphic — resolved via owner_type), status_id (FK → asset_statuses), vendor_id (FK), purchase_date, cost, currency_id (FK), warranty_start, warranty_end, useful_life_months, residual_value, depreciation_method_id (FK, nullable), notes, parent_asset_id (FK → assets, nullable — **this is the bundle mechanism**: a child asset like a monitor points to its parent "Dell Desktop Bundle" asset), created_at

> **Bundles**: modeled as self-referencing `parent_asset_id`. The bundle itself is a row in `assets` (e.g. category = "Bundle"); CPU/monitor/keyboard/mouse are separate `assets` rows each with `parent_asset_id` = the bundle's id and their own barcode. Assignment logic: assigning the parent cascades to children unless a child is explicitly split out (tracked via `is_split_from_bundle` bool on the child).

**asset_attachments**
- id (PK), asset_id (FK), type (image/invoice/document/disposal_certificate), file_url, uploaded_by (FK → users), uploaded_at

**asset_assignments** *(history table — every check-out/check-in/transfer is a row, never overwritten)*
- id (PK), asset_id (FK), assigned_to_type (employee/department/business_unit/location/project), assigned_to_id, assigned_by (FK → users), assigned_at, returned_at (nullable), condition_on_return, remarks, signature_url, action_type (checkout/checkin/transfer)

**projects** *(lightweight — assignment target only, not a full PM module)*
- id (PK), company_id (FK), name, code, status

**asset_transfers**
- id (PK), asset_id (FK), from_company_id, to_company_id, from_org_unit_id, to_org_unit_id, from_location_id, to_location_id, transferred_by (FK → users), transferred_at, reason

**asset_disposals**
- id (PK), asset_id (FK), reason, approved_by (FK → users), certificate_url, data_wipe_confirmed (bool), disposal_vendor, disposal_date

**depreciation_entries** *(computed, one row per period per asset — enables audit + reporting without recomputation)*
- id (PK), asset_id (FK), period_start, period_end, period_type (monthly/quarterly/annual — copied from the setting in force when the entry was generated, so a later frequency change doesn't rewrite history), opening_value, depreciation_amount, closing_value, method_used

**depreciation_settings** *(the missing config screen — calculation frequency is set here, not per-asset)*
- id (PK), scope_type (global/company/category), scope_id (nullable — company_id or category_id depending on scope_type), method (straight_line/declining_balance/none), calculation_frequency (monthly/quarterly/annual), declining_balance_rate (percent, only used when method = declining_balance)

> **Resolution order**: an asset's effective depreciation settings resolve category-level override → company-level override → global default. This is the same override pattern as the rest of admin config (3.6), just applied to method **and** frequency together so they can't drift out of sync (e.g. a category using monthly straight-line while its company default is quarterly).
>
> **Calculation logic**:
> - *Straight-line*: `annual_depreciation = (cost - residual_value) / useful_life_years`. A monthly run posts `annual_depreciation / 12` per period; quarterly posts `annual_depreciation / 4`; annual posts the full amount once a year. Changing frequency mid-life doesn't restate past entries — it only changes the size and cadence of future ones, with the remaining book value as the new starting point.
> - *Declining balance*: each period applies `declining_balance_rate` to the **current** closing value (not original cost), so `depreciation_amount = opening_value × rate`, prorated for the period length (rate/12 for monthly, rate/4 for quarterly). This means declining-balance results are frequency-sensitive by design — monthly compounding depreciates faster in early periods than annual compounding at the same nominal rate, which is expected and worth flagging to whoever sets the rate.
> - A scheduled job (or manual "Run depreciation" action) generates the next `depreciation_entries` row per asset per period; nothing is calculated on the fly at report time.

### 4.4 Software / SaaS

**software_licenses**
- id (PK), software_name, vendor_id (FK), version, license_key, license_type_id (FK), subscription_type_id (FK), company_id (FK), purchase_date, expiry_date, renewal_date, seats_purchased, seats_used (derived or maintained), cost, currency_id, owner_employee_id (FK, nullable — for SaaS "Owner" field), org_unit_id (FK, nullable)

**software_assignments**
- id (PK), license_id (FK), employee_id (FK, nullable), asset_id (FK, nullable — device install), assigned_at, revoked_at (nullable)

### 4.5 Network & Relationship Mapping

Network components (switches, routers, firewalls, APs, patch panels) are stored as **assets** with `category_id` pointing to network categories, plus an extension table for network-specific fields:

**network_asset_details**
- asset_id (PK, FK → assets), ip_address, mac_address, firmware_version, os, port_count, config_backup_url, rack_id (FK, nullable)

**racks**
- id (PK), data_center_id (FK), name, position

**data_centers**
- id (PK), company_id (FK), name, location_id (FK)

**asset_relationships** *(generic graph edges for the dependency map: App→Server→Rack→DC, DB→Server, etc.)*
- id (PK), source_asset_id (FK), target_asset_id (FK), relationship_type (runs_on/depends_on/connected_to/located_in)

### 4.6 Repair & Maintenance

**repair_records**
- id (PK), asset_id (FK), issue_description, vendor_id (FK), sent_date, estimated_return_date, actual_return_date (nullable), repair_cost, currency_id, under_warranty (bool), status (sent/in_progress/completed/cancelled), notes

**repair_replacements** *(temporary stand-in while the original is out for repair)*
- id (PK), repair_record_id (FK), replacement_asset_id (FK → assets, nullable — set when sourced from internal stock), replacement_source (warranty_vendor/internal_stock), issued_at, recovered_at (nullable — set automatically when original asset returns and replacement is pulled back)

> Logic: opening a `repair_record` for an asset sets that asset's status to `Under Repair`. If a replacement is issued, the replacement asset's status flips to `Assigned` (to the same employee/location as the original) and is linked via `repair_replacements`. When `actual_return_date` is set on the repair record, the replacement is automatically recovered (status reverts to `Available`) and the original asset's status reverts to its prior assignment.

### 4.7 Contracts & Warranty

**contracts** *(vendor contracts, AMC, maintenance & support agreements, software agreements — one table, typed)*
- id (PK), company_id (FK), contract_type (AMC/maintenance/support/software_agreement/vendor_contract), vendor_id (FK), title, related_asset_id (FK, nullable), related_software_license_id (FK, nullable), start_date, end_date, renewal_date, auto_renew (bool), cost, currency_id, document_url, status

**warranty_extensions** *(warranty is tracked primarily on `assets.warranty_start/warranty_end`; extensions are logged separately so the original term is never overwritten)*
- id (PK), asset_id (FK), extended_by_vendor_id (FK), previous_end_date, new_end_date, cost, purchased_at

### 4.8 Inventory Audit

**audit_sessions**
- id (PK), company_id (FK), scope (org_unit_id / location_id / category_id — whichever the audit is scoped to), started_by (FK → users), started_at, completed_at (nullable), status (in_progress/completed)

**audit_scans** *(one row per barcode scanned during a session — reconciled against expected asset list to produce mismatch/missing/unexpected reports)*
- id (PK), audit_session_id (FK), asset_id (FK, nullable — null if scanned barcode doesn't match any known asset), scanned_barcode, scanned_by (FK → users), scanned_at, result (matched/mismatched_location/unexpected/missing — missing rows are generated post-session for assets never scanned)

### 4.9 Procurement

**purchase_orders**
- id (PK), company_id (FK), po_number, vendor_id (FK), status (draft/pending_approval/approved/ordered/received/closed/cancelled), requested_by (FK → users), approved_by (FK, nullable), total_cost, currency_id, created_at

**purchase_order_lines**
- id (PK), po_id (FK), description, category_id (FK, nullable), quantity, unit_cost, received_asset_id (FK → assets, nullable — set once the line item is received and turned into an asset record, closing the loop from request to inventory)

### 4.10 Discovery & Reconciliation *(closes the manual-entry gap vs. ServiceNow/AssetExplorer's network auto-discovery)*

**discovered_devices** *(staging table — raw scan results, not yet trusted asset records)*
- id (PK), company_id (FK), ip_address, mac_address, hostname, os, discovered_via (agent/agentless_scan/manual_import), first_seen, last_seen, matched_asset_id (FK → assets, nullable), reconciliation_status (new/matched/ignored)

**software_installations** *(what's actually installed, per device — separate from `software_assignments`, which is what's licensed/entitled; comparing the two is what powers compliance and shelfware detection)*
- id (PK), asset_id (FK), software_name, version, detected_at, is_authorized (bool — computed by matching against `software_licenses`), usage_frequency (frequent/occasional/unused/unknown)

> This is the mechanism behind AssetExplorer-style compliance flash charts (under-licensed / over-licensed / compliant) and unauthorized-software alerts: reconcile `software_installations` against `software_licenses.seats_used`, and flag anything installed with `is_authorized = false`.

### 4.11 Self-Service & Requests *(gap vs. Zoho — currently everything is admin/technician-driven)*

**asset_requests**
- id (PK), employee_id (FK), request_type (new_hardware/software_license/upgrade/repair), category_id (FK, nullable), justification, status (submitted/approved/rejected/fulfilled), approved_by (FK, nullable), requested_at, fulfilled_asset_id (FK → assets, nullable)

### 4.12 Automation Rules *(gap vs. ServiceNow — our lifecycle logic so far is implicit in application code; this makes it admin-configurable)*

**automation_rules**
- id (PK), company_id (FK), name, trigger_event (warranty_expiring/contract_expiring/repair_returned/license_threshold_reached/asset_idle/disposal_due), condition_json, action (send_notification/create_task/change_status/create_disposal_request), is_active

### 4.13 Custom Fields *(gap vs. Jira Assets — their object-type model lets admins define arbitrary attributes; we adopt a lighter version scoped to existing entities rather than a full free-form schema builder)*

**custom_field_definitions**
- id (PK), entity_type (asset/employee/software_license), category_id (FK, nullable — scope to one asset category, e.g. extra fields only on Laptops), field_name, field_type (text/number/date/dropdown), is_required

**custom_field_values**
- id (PK), field_definition_id (FK), entity_id, value

### 4.14 Service Management

**incidents**
- id (PK), incident_number, asset_id (FK, nullable), employee_id (FK, reporter), priority, category, severity, status, assigned_engineer_id (FK → users), root_cause, resolution, opened_at, resolved_at, sla_due_at

**incident_timeline** — id, incident_id (FK), event_text, created_by, created_at
**incident_attachments** — id, incident_id (FK), file_url

**problems**
- id (PK), problem_number, title, root_cause, known_error, fix, status

**problem_incidents** (junction) — problem_id, incident_id

**changes** *(Change Management — referenced alongside Incident/Problem)*
- id (PK), change_number, title, description, related_asset_id (FK, nullable), risk_level, status, requested_by, approved_by, scheduled_at

### 4.15 Cross-Cutting

**audit_logs**
- id (PK), user_id (FK), action (login/logout/create/update/delete/assign/return/transfer/approval/import/export/password_reset), entity_type, entity_id, field_name (nullable), old_value, new_value, ip_address, user_agent, created_at

**notifications**
- id (PK), type (renewal/warranty/maintenance/assignment/return/incident/approval), entity_type, entity_id, recipient_user_id (FK), channel (email/dashboard/toast), trigger_offset_days (30/15/7/1/0), sent_at, read_at

**notification_templates**
- id (PK), event_type, subject, body_template

---

## 5. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript, Tailwind | Matches your bulk-screen, table-heavy UI needs; component reuse across Hardware/Software/Employee list+detail patterns |
| Database | Postgres (via Supabase) **or** MySQL/MariaDB — see comparison below | Both are free and open-source; the schema in section 4 works on either with minor adjustments |
| Barcode/QR | `bwip-js` or `jsbarcode` (Code128) + `qrcode` libraries, client-side generation, print via browser | No external service needed |
| Notifications | Scheduled job (Supabase Edge Functions, or a plain cron job / node-cron if self-hosting) + email provider (Resend/SendGrid — both have free tiers) | Handles 30/15/7/1-day renewal triggers |
| Hosting | Vercel (frontend, free tier) + database host of choice | Fast iteration; Vercel and Supabase are both available as connectors in this chat |

### Database options — all $0 to start

| Option | Cost | What you get | Trade-off vs. this schema |
|---|---|---|---|
| **Postgres via Supabase** | Free tier: 500MB DB, 1GB storage, 50k monthly active users | Managed Postgres + built-in Auth + file Storage + Row-Level Security, all in one — and it's already a connector in this chat, so I can provision it directly | Free tier pauses after a week of inactivity (auto-resumes on next request); fine for dev/demo, worth a paid tier ($25/mo) before production |
| **Self-hosted Postgres** | Free (pay only for a VM — e.g. a $5-6/mo droplet, or free-tier VMs from Oracle Cloud/Fly.io) | Full control, no vendor limits | You run auth, backups, and file storage yourself instead of getting them bundled |
| **MySQL / MariaDB** | Free — open-source, ubiquitous free hosting (PlanetScale free tier, Railway, Aiven, or any $0-5/mo shared host) | Most widely supported option for cheap/shared hosting; huge tooling and hiring pool | The schema's `enum` columns become `VARCHAR` + `CHECK` constraints (MySQL enums are more limited); no native Row-Level Security, so RBAC scoping has to be enforced entirely in the application layer instead of at the DB layer |
| **SQLite** | Free, zero server | Good for a local prototype or single-branch pilot | Not built for concurrent multi-user, multi-company write load at the scale this system targets (100k+ assets, 10k+ employees) — fine to test the schema locally, not a production choice here |

My actual recommendation: **Postgres**, either via Supabase's free tier for now or self-hosted later — not because MySQL can't do the job, but because Row-Level Security is what makes the RBAC + multi-company scoping (section 4.2) enforced at the database level instead of trusted to application code. If MySQL is a hard preference (existing team expertise, existing infra), the schema ports over fine — you'd just move permission checks into a service layer.

---

## 6. Non-Functional Targets (from SRS)

| Area | Target |
|---|---|
| Scale | 100,000+ assets, 10,000+ employees |
| Performance | Sub-3-second response for standard operations |
| Availability | 99.9% uptime target |
| Security | RBAC, MFA-ready, password encryption, audit logging, session timeout, HTTPS/TLS |
| Backup | Automated daily backups, point-in-time recovery, disaster recovery |
| Deployment | Cloud-ready, with on-prem as a possible future option |

Supabase covers most of this out of the box (managed Postgres with PITR, TLS by default, daily backups on paid tiers); the 100k-asset / 10k-employee scale is comfortably within Postgres' range with proper indexing on `company_id`, `status_id`, and `current_owner_id` — worth flagging as an implementation checklist item rather than an architecture change.

---

## 7. What's next

Org model, schema (now including the ServiceNow/Zoho/Jira gap additions), and module sequencing are covered. The Dashboard / Org Structure / Employee / Hardware Asset prototype already exists as a separate frontend-only build. Natural next slice: either extend the prototype with Check-Out/Check-In screens, or mock up the new additions here (self-service request form, PO approval flow) — whichever's more useful to look at next.
