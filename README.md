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
3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key (Supabase dashboard → Project Settings → API).
4. Restart `npm run dev` — the Org Structure page will now show "Live — connected to Supabase" and read real data instead of the mock set.

## Deploying (Vercel)

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add the two env vars from `.env.example` under Project Settings → Environment Variables, using your real Supabase project's values.
4. Deploy. `vercel.json` is already set up to route all paths through `index.html`, which `react-router` needs.

## Status

**Every module from the original architecture doc has a working screen.** Summary:

| Module | Status |
|---|---|
| Org Structure, Employees, Hardware Assets, Dashboard | ✅ Live/mock data |
| Companies, Org Units, Master Data, Departments/Locations/Cost Centers | ✅ Admin CRUD |
| Roles & Permission Matrix, Users | ✅ Admin CRUD (auth via Supabase Auth, not this table) |
| Check-Out / Check-In | ✅ Real state transitions |
| Procurement | ✅ PO → line items → receive-into-asset |
| Self-Service | ✅ Portal + approval queue |
| Software & SaaS Licenses | ✅ Seat assignment/revocation |
| Network Components | ✅ Device details + relationship graph (list form) |
| Repair & Maintenance | ✅ Full replacement issue/recover workflow |
| Contracts & Warranty | ✅ Renewal urgency + extension log |
| Incidents / Problems / Changes | ✅ Status pipeline + timeline (Incidents); list+create (Problems/Changes) |
| Inventory Audit | ✅ Scan reconciliation + missing-asset report |
| Reports | ✅ 6 reports, CSV export |
| Barcode Printing | ✅ Real Code128 + QR generation, print-ready |
| Automation Rules | ✅ Configuration UI only — no execution engine (see below) |

### Module notes worth knowing before you build further

- **Auth**: the `users` table is app-level data only (role links, employee link, lock status). Real credentials live in Supabase's built-in `auth.users`. There's no login screen yet — several screens (Self-Service, Check-Out/Check-In) use a plain picker as a stand-in for "who's logged in," flagged inline in the UI rather than hidden.
- **Check-Out/Check-In**: checking out sets the asset's owner + status and logs an `asset_assignments` row; checking in closes that row and returns the asset to Available — or leaves it flagged if condition is Damaged/Needs Repair, which is where Repair & Maintenance picks up.
- **Repair & Maintenance**: the one module with real state-machine logic — issuing a temporary replacement (internal stock or vendor loaner) hands the original's assignment to the replacement; completing the repair auto-recovers it.
- **Procurement**: receiving a PO line while it's "ordered" creates a real `assets` row and links it back — an actual request-to-inventory loop, not just a status tracker.
- **Network Components**: the relationship graph (`asset_relationships`) is fully functional data-wise but only rendered as a list, not a visual graph, yet.
- **Automation Rules**: this screen configures rules (trigger → action) but nothing executes them — that needs a Supabase Edge Function on a cron schedule, which is real backend infrastructure a frontend can't do on its own.
- **Reports**: CSV export only — no PDF/Excel export or scheduled email delivery yet.
- **Demo-mode writes**: most admin writes are blocked without Supabase connected (with a clear disabled-state tooltip). A few low-stakes ones — Self-Service requests, Problems/Changes, Inventory Audit sessions — work against an in-memory mock store even in demo mode, since they're safe to click through without a backend.

**What's genuinely still missing for production use:** a real login screen, a scheduled job runner for notifications/automation rules, PDF/Excel report export, and a visual (not list-form) relationship graph.
