# ITAMS — Karawa Group

Enterprise IT Asset Management System prototype for the Karawa group of companies (Karawa, O2 Café, Joy, JOT Events).

## What's here

- `src/` — React + TypeScript + Tailwind frontend. Currently implements Dashboard, Org Structure, Employees, and Hardware Assets (including bundle drill-down) against in-memory mock data (`src/lib/mockData.ts`) — no backend wired up yet.
- `db/schema.sql` — full Postgres schema for the whole system (org structure, RBAC, hardware/software assets, procurement, repair & replacement, contracts, incidents/problems/changes, inventory audit, discovery/reconciliation, self-service requests, automation rules, custom fields, audit trail). Run this against a fresh Postgres/Supabase database to stand up the real backend.

See the project's architecture doc and screens/fields/functions spec (shared alongside this repo) for the full module list and build roadmap.

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Database setup (when you're ready to wire up a real backend)

```bash
# against a local or hosted Postgres instance
psql "$DATABASE_URL" -f db/schema.sql
```

Or paste `db/schema.sql` into the Supabase SQL editor if using Supabase.

## Status

Frontend-only prototype. Not yet connected to a database — mock data lives in `src/lib/mockData.ts`. Next steps: wire up Supabase client, replace mock data with real queries, add remaining screens (Check-Out/Check-In, Procurement, Self-Service, Incidents, Repair, Contracts, Reports, Admin).
