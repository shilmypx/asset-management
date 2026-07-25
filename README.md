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

**Phase 1 (System Admin, RBAC, Employees) complete:**
- **Live-data-ready:** Org Structure, Employees, Hardware Assets, Dashboard
- **Admin screens:** Companies, Org Units, Roles & Permission Matrix, Users (lock/unlock, role visibility, profile creation)
- **Auth architecture note:** the `users` table is app-level data only (role links, employee link, lock status) — actual credentials live in Supabase's built-in `auth.users`, not in this table. `password_hash` exists in `db/schema.sql` for reference against the original SRS field list but the app never writes to it. Inviting a user still requires a manual step via the Supabase dashboard or an Edge Function with the service role key — that can't run from the browser with the anon key, so it's intentionally not automated here.

**Not yet built (Phase 2+):** Departments/Locations/Cost Centers/Master Data admin, Check-Out/Check-In, Procurement, Self-Service, Software & SaaS Licenses, Incidents, Repair, Contracts, Reports. Schema for all of it exists in `db/schema.sql`.
