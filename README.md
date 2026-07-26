# ITAMS — Karawa Group

Enterprise IT Asset Management System prototype for the Karawa group of companies (Karawa, O2 Café, Joy, JOT Events).

## What's here

- `src/` — React + TypeScript + Tailwind frontend. Currently implements Dashboard, Org Structure, Employees, and Hardware Assets (including bundle drill-down) against in-memory mock data (`src/lib/mockData.ts`) — no backend wired up yet.
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

**Phase 1 (System Admin, RBAC, Employees) and the start of Phase 2 complete:**
- **Live-data-ready:** Org Structure, Employees, Hardware Assets, Dashboard
- **Admin screens:** Companies, Org Units, Roles & Permission Matrix, Users, Master Data (Asset Categories/Manufacturers/Statuses/License Types/Subscription Types/Currencies/Employment Types/Vendors — one generic screen), Departments/Locations/Cost Centers (tabbed, company-scoped)
- **Check-Out / Check-In** — real assignment flow: checking out sets the asset's owner + status and logs an `asset_assignments` row; checking in closes that row, records condition/remarks, and returns the asset to Available (or leaves it unassigned-but-flagged if condition is Damaged/Needs Repair, ready for a repair record next)
- **Auth architecture note:** the `users` table is app-level data only (role links, employee link, lock status) — actual credentials live in Supabase's built-in `auth.users`, not in this table.

**Not yet built:** Reports, Barcode printing, Automation Rules. Schema for all of it exists in `db/schema.sql`.

**Inventory Audit** — start a session scoped to a company, scan barcodes against that company's expected assets (matched/unexpected tallied live), and "Complete audit" computes the "missing" list — every expected asset never scanned — as a report rather than a manual checklist. Works fully in demo mode (in-memory sessions) since it's genuinely useful to try without a backend.

**Incidents / Problems / Changes** — three tabs, one shared page. Incidents have the most depth: a status pipeline (Open → In Progress → Resolved → Closed) and a running timeline you can append updates to, matching the "audit trail per ticket" pattern from the spec. Problems and Changes are lighter (list + create) since they see far less day-to-day volume — this matched effort to actual usage rather than building all three to the same depth by default. Problems/Changes writes work in demo mode too (like Self-Service) since they're low-stakes to click through.

**Contracts & Warranty** — contracts list with color-coded renewal urgency (red = overdue, amber = within 30 days, green = fine), plus a warranty extension log. Logging an extension updates the asset's current `warranty_end` while leaving the extension history intact as its own record — so "what's the current coverage" and "how did we get here" are both answerable.

**Repair & Maintenance** — this is the module with actual state-machine logic, not just a status tracker: sending an asset for repair flips it to "Under Repair"; issuing a temporary replacement (from internal stock or noted as a warranty vendor loaner) hands the original asset's assignment to the replacement; marking the repair complete auto-recovers any active replacement and returns both assets to their correct states in one action.

**Network Components** — filters Hardware Assets down to network-category devices (Router/Firewall/Switch/Server/etc.), shows IP/MAC/firmware/rack from `network_asset_details`, and lets you build the dependency graph (`asset_relationships`) directly from the detail panel — e.g. "Server connected to Router". This is the data behind the App→Server→Rack→Data Center relationship mapping from the original spec; there's no visual graph rendering yet, just the list form of it.

**Self-Service** — employee portal (My Assets, My Requests, New Request form) + an admin approval queue. No login screen exists yet, so "who's viewing" is a plain employee picker standing in for a real Supabase Auth session — flagged in the UI itself, not hidden. Demo mode lets you actually submit a request (it mutates an in-memory list) even though other demo-mode writes are blocked, since this one's low-stakes and worth being able to click through without a backend.

**Software & SaaS Licenses** — list with a seat-usage bar (color-coded: teal → amber near capacity → red at/over capacity), detail panel with assign/revoke that keeps `seats_used` in sync on both operations. Assign is blocked once seats are fully used rather than silently over-allocating.

**Procurement** — PO list + line items + status workflow (draft → pending approval → approved → ordered → received → closed). Receiving a line while a PO is "ordered" creates a real `assets` row and links it back to the line — this is the actual request-to-inventory loop, not just a status tracker.
