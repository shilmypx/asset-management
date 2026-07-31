# ITAMS — Karawa Group

Enterprise IT Asset Management System prototype for the Karawa group of companies (Karawa, O2 Café, Joy, JOT Events).

## What's here

- `src/` — React + TypeScript + Tailwind frontend. Every module from the architecture doc has a working screen — see the Status section below for the full list and what's live vs. demo-mode.
- `db/schema.sql` — full Postgres schema for the whole system (org structure, RBAC, hardware/software assets, procurement, repair & replacement, contracts, incidents/problems/changes, inventory audit, discovery/reconciliation, self-service requests, automation rules, custom fields, audit trail). Run this against a fresh Postgres/Supabase database to stand up the real backend.

See the project's architecture doc and screens/fields/functions spec (shared alongside this repo) for the full module list and build roadmap.

## Getting started (demo mode — no backend needed)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` running against in-memory mock data. Fine for browsing the UI; nothing persists and writes are disabled until a backend is connected.

## Connecting a real backend (Supabase)

1. Create a free Supabase project at [supabase.com](https://supabase.com) (or your own — organization/project name doesn't matter).
2. Run the schema against it: open the Supabase SQL editor and paste in the contents of `db/schema.sql` (or `psql "$DATABASE_URL" -f db/schema.sql` if you prefer the CLI). This creates all tables and seeds the four companies (Karawa, O2 Café, Joy, JOT Events) plus the shared departments. Then run `db/views.sql` the same way — it adds the joined views (`v_employees`, `v_assets`) the frontend queries.
3. **Run `db/rls-policies.sql` before going anywhere near real data.** Without it, the anon key has no restrictions at all — any authenticated user (or, depending on your project's defaults, possibly anyone with the anon key) can read and write every company's data. This file enables Row-Level Security and scopes every table to the companies a user actually has a role in. It's not optional hardening — treat it as part of the schema setup, not a later step.
4. Run `db/config-schema.sql` then `db/backup-schema.sql` (same SQL editor, same order matters — each depends on tables/functions from the ones before it). These back the Configuration page: HR sync, label print layout, notification routing, approvals, and database backup settings.
5. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key (Supabase dashboard → Project Settings → API).
6. Restart `npm run dev` — the Org Structure page will now show "Live — connected to Supabase" and read real data instead of the mock set.

## Setting up the extras: HR sync webhook, automation rules, and database backups

These three features have real server-side code, but none of it runs automatically just from having a Supabase project — each needs its own one-time deployment step, because each does something a browser genuinely cannot do (verify webhook signatures with a secret, run on a schedule, or shell out to `pg_dump`).

### HR sync webhook

Only needed if you'll use `webhook` mode in Configuration → Integrations (vs. manual entry or scheduled polling).

```bash
supabase functions deploy hr-sync-webhook --no-verify-jwt
```

`--no-verify-jwt` because the HR system isn't a Supabase Auth user — it authenticates via an HMAC signature instead (see the function's own header comment for the exact request format your HR system needs to send, and where the signing secret comes from). The request contract in that file is a reasonable starting point, not a negotiated spec with any real HR vendor — expect to adjust the field mapping.

### Automation rules

```bash
supabase functions deploy run-automation-rules
```

Then run `db/schedule-automation.sql` in the SQL editor (fill in your project ref and key) to schedule it daily via `pg_cron`.

### Database backups (pg_dump → OneDrive)

This one's the most involved, because a full binary database backup needs `pg_dump` and a real filesystem — neither of which exist in Supabase's Edge Function runtime (Deno). So the actual backup runs in **GitHub Actions** instead (`.github/workflows/database-backup.yml` + `scripts/backup-database.mjs`), which has both. Supabase's role is just: hold the schedule/destination config (Configuration → Database Backup) and provide a small Edge Function (`trigger-instant-backup`) that fires the GitHub Action's `workflow_dispatch` when someone clicks "Backup now."

1. **Deploy the trigger function:**
   ```bash
   supabase functions deploy trigger-instant-backup
   supabase secrets set GITHUB_PAT=<fine-grained token, Actions:write, scoped to this repo only>
   supabase secrets set GITHUB_REPO=shilmypx/asset-management
   ```
2. **Register an Azure AD app** (Azure Portal → App registrations → New registration) for OneDrive access via Microsoft Graph. Add the `Files.ReadWrite.All` **application** permission (not delegated) and grant admin consent — app-only auth is what lets the backup run unattended, without a signed-in user. Note the Application (client) ID, Directory (tenant) ID, and create a client secret.
3. **Add repo secrets** (GitHub → this repo → Settings → Secrets and variables → Actions):
   - `DATABASE_URL` — Supabase → Project Settings → Database → Connection string ("URI", use the pooler connection)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ONEDRIVE_TENANT_ID`, `ONEDRIVE_CLIENT_ID`, `ONEDRIVE_CLIENT_SECRET` — from step 2
   - `ONEDRIVE_USER_ID` — the UPN or object ID of the OneDrive account backups should land in (app-only Graph auth needs a specific user's drive, not "me")
   - `RESEND_API_KEY`, `FAILURE_EMAIL_FROM` — for the failure notification email (Resend, verified sending domain)
4. Set the schedule and folder path in Configuration → Database Backup — the client ID/tenant ID fields there are for your own reference (they're not secret); the actual client *secret* only ever lives in the GitHub repo secret from step 3, never in the database.

The workflow itself runs hourly and checks `backup_settings` each time to decide whether it's actually due (so "every 4 hours" or "weekly on Tuesdays at 2am" from the Configuration page means something) — it's not a dumb hourly backup.

## RBAC coverage — what's actually enforced, and where

Two layers, both real now:

- **Frontend**: `src/lib/AuthGate.tsx` exposes `can(module, action)`, backed by the signed-in user's actual granted permissions (loaded in `src/lib/auth.ts` from `user_roles` → `role_permissions` → `permissions`). The Sidebar nav filters every item by `can(module, "view")` — a user without a role sees only what they're allowed to. Every screen with a write action gates its buttons on the real permission, not on "is a backend connected" (a distinct, weaker check that used to be the *only* one everywhere).
- **Backend (RLS)**: `db/rls-policies.sql` enforces the same matrix at the database layer via `has_permission()`, covering the 13 primary company-owned tables, ITSM (incidents/problems/changes — previously fake "authenticated-only" policies where the Roles screen's checkboxes did nothing), Self-Service requests (with `requests:approve` distinct from `requests:add`), and the highest-traffic child tables (assignments, transfers, disposals, repair records/replacements, warranty extensions, software assignments, audit scans, PO lines).

**Still intentionally out of scope**, documented in the SQL file rather than silently absent: a handful of lower-stakes child tables (asset attachments, depreciation entries, network details, software installs from discovery, asset relationships, racks, employee-department links) and `custom_field_values` are company-scoped but not permission-matrix-scoped — mostly system-written, or genuinely hard to scope generically (`custom_field_values.entity_id` can point at several different tables). Extending them is the same mechanical pattern used everywhere else, just prioritized lower since they're not in the primary UI flows.

Also worth not confusing with the above: `Assets.tsx` and `Employees.tsx` have no Add/Edit forms at all yet (list + detail view only) — that's a separate feature gap, not an RBAC gap.

## Deploying (Vercel)

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add the two env vars from `.env.example` under Project Settings → Environment Variables, using your real Supabase project's values.
4. Deploy. `vercel.json` is already set up to route all paths through `index.html`, which `react-router` needs.

## Status

**Every module from the original architecture doc has a working screen.** Summary:

| Module | Status |
|---|---|
| **Login / session** | ✅ Real Supabase Auth sign-in, gates the whole app when a backend is connected |
| Org Structure, Employees, Hardware Assets, Dashboard | ✅ Live/mock data |
| Companies, Org Units, Master Data, Departments/Locations/Cost Centers | ✅ Admin CRUD |
| Roles & Permission Matrix, Users | ✅ Admin CRUD (auth via Supabase Auth, not this table) |
| Check-Out / Check-In | ✅ Real state transitions |
| Procurement | ✅ PO → line items → receive-into-asset |
| Self-Service | ✅ Portal + approval queue |
| Software & SaaS Licenses | ✅ Seat assignment/revocation |
| Network Components | ✅ Device details + relationship graph (list AND visual topology view) |
| Repair & Maintenance | ✅ Full replacement issue/recover workflow |
| Contracts & Warranty | ✅ Renewal urgency + extension log |
| Incidents / Problems / Changes | ✅ Status pipeline + timeline (Incidents); list+create (Problems/Changes) |
| Inventory Audit | ✅ Scan reconciliation + missing-asset report |
| Reports | ✅ 6 reports, CSV export + print-to-PDF |
| Barcode Printing | ✅ Real Code128 + QR generation, print-ready |
| Automation Rules | ✅ Config UI + real Edge Function (not auto-deployed — see below) |
| Global Search | ✅ Dashboard, categorized results, camera barcode/QR scan, contextual actions (Edit, Assign/Transfer, Incident, Change, Problem) |
| Configuration | ✅ HR sync (manual/scheduled/webhook), Barcode & Label printing layout, Email notification routing, Approvals, Database Backup, Master Data (links to existing screens) |
| RBAC coverage | ✅ Real permission checks (not just "is a backend connected") on every screen with a write action; nav filtered by view permission; ITSM and Self-Service extended from placeholder policies to real `has_permission()` checks — see below |

### Module notes worth knowing before you build further

- **Auth**: real Supabase Auth sign-in now gates the app — when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set, you'll see a login screen instead of the app until you sign in; demo mode (no env vars) skips it entirely since there's no backend to authenticate against. The `users` table is still app-level data only (role links, employee link, lock status) — it's linked to the real `auth.users` row by matching email. **To create someone's first login**: Supabase dashboard → Authentication → Users → Invite user (sends them a password-setup email) — that's the credential half; separately, use the Users admin screen in-app to create their app-level profile (employee link, role) with a matching email. Self-Service now shows "Signed in as [name]" automatically once your account is linked to an employee record this way — the picker only appears as a fallback in demo mode or if the link isn't set up yet.
- **Check-Out/Check-In**: checking out sets the asset's owner + status and logs an `asset_assignments` row; checking in closes that row and returns the asset to Available — or leaves it flagged if condition is Damaged/Needs Repair, which is where Repair & Maintenance picks up.
- **Repair & Maintenance**: the one module with real state-machine logic — issuing a temporary replacement (internal stock or vendor loaner) hands the original's assignment to the replacement; completing the repair auto-recovers it.
- **Procurement**: receiving a PO line while it's "ordered" creates a real `assets` row and links it back — an actual request-to-inventory loop, not just a status tracker.
- **Network Components**: the relationship graph (`asset_relationships`) is fully functional data-wise but only rendered as a list, not a visual graph, yet.
- **Automation Rules**: this screen configures rules (trigger → action) but nothing executes them — that needs a Supabase Edge Function on a cron schedule, which is real backend infrastructure a frontend can't do on its own.
- **Reports**: CSV export only — no PDF/Excel export or scheduled email delivery yet.
- **Demo-mode writes**: most admin writes are blocked without Supabase connected (with a clear disabled-state tooltip). A few low-stakes ones — Self-Service requests, Problems/Changes, Inventory Audit sessions — work against an in-memory mock store even in demo mode, since they're safe to click through without a backend.

**Security note — read this before connecting real data:** the architecture doc recommended Postgres specifically for Row-Level Security. `db/rls-policies.sql` now enforces two layers: the multi-tenant company-scoping boundary (a Karawa user can't touch O2 Café's data) on every table, and the actual view/add/edit/delete-per-module permission matrix from the Roles & Permission screen on the 13 primary company-owned tables — write operations genuinely check `has_permission()` now, not just company membership. Roles marked `is_system_role` bypass the permission check (still subject to company-scoping), so an admin role doesn't need every checkbox individually ticked. The `permissions` table went from 7 seeded modules to 14, covering every functional area the app actually has. What's *not* covered: child/detail tables reached only via a parent (attachments, assignments, repair records, PO lines, etc.) inherit company-scoping from their parent but don't independently check permissions for their own module — extending that is mechanical repetition of the same pattern, not a design gap, and is documented as such in the SQL file itself.

**Automation execution:** the last functional piece is real code in `supabase/functions/run-automation-rules/`, not deployed from here since that needs your own `supabase` CLI login:

```bash
supabase functions deploy run-automation-rules
```

Then run `db/schedule-automation.sql` in the Supabase SQL editor (filling in your project ref and key) to schedule it daily via `pg_cron`. It evaluates `warranty_expiring`, `contract_expiring`, and `license_threshold_reached` against real data and writes `notifications` rows — `repair_returned`/`asset_idle`/`disposal_due` and three of the four possible actions are left as documented follow-ups in the function's own comments rather than stubbed to look finished when they aren't.

- **Network Components** now has a **Topology** view (toggle next to the device list) — an SVG graph laying devices out in a circle with color-coded edges per relationship type (connected to / depends on / runs on / located in), reading live from `asset_relationships`.
- **Reports** now has a **Print / Save as PDF** button alongside CSV export — uses the browser's native print-to-PDF with a print stylesheet that hides the sidebar/nav/picker and prints just the report table.

(Check-Out/Check-In's employee picker is intentional, not a gap — an IT tech assigning a laptop to someone else is supposed to pick who, not use their own identity.)
