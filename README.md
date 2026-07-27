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
4. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key (Supabase dashboard → Project Settings → API).
5. Restart `npm run dev` — the Org Structure page will now show "Live — connected to Supabase" and read real data instead of the mock set.

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
