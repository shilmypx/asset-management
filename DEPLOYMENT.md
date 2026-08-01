# ITAMS — Deployment Guide

A step-by-step walkthrough to take this repo from zero to a live, working system. Follow the parts in order — each one depends on the last.

**Estimated time:** 30–45 minutes for Parts 1–4 (a working live app). Parts 5–6 (backups, HR sync, automation) are optional add-ons you can do later.

---

## What you'll end up with

- A Postgres database (hosted on Supabase) with the full schema, security rules, and seed data
- A live web app (hosted on Vercel) that real users can sign into
- One working admin account
- *(Optional)* Scheduled database backups to OneDrive, an HR system sync webhook, and automated warranty/contract/license alerts

## Accounts you'll need

| Service | For | Cost |
|---|---|---|
| [Supabase](https://supabase.com) | Database, authentication, file storage | Free tier is enough to start |
| [Vercel](https://vercel.com) | Hosting the web app | Free tier is enough to start |
| GitHub | Already have this — it's where the code lives | Free |
| *(Optional)* [Resend](https://resend.com) | Sending backup-failure emails | Free tier: 100 emails/day |
| *(Optional)* Azure AD / Microsoft 365 admin access | OneDrive backup storage | Only if your org already has Microsoft 365 |

---

## Part 1 — Database (Supabase)

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) → **New Project**.
2. Pick any name and region (closer to your users = faster).
3. Save the database password it generates somewhere safe — you'll need it later for the backup script.
4. Wait ~2 minutes for the project to finish provisioning.

### 1.2 Run the database script

1. In the Supabase dashboard, open **SQL Editor** (left sidebar) → **New query**.
2. Open `db/00-complete-setup.sql` from this repo, copy the *entire* contents, and paste it into the SQL editor.
3. Click **Run**. This creates every table, view, security policy, and seed row in one pass — it should take a few seconds and finish with no errors.

**If it errors partway through:** the script runs top-to-bottom and later parts depend on earlier ones — a red error early on (e.g. in the schema section) means nothing after it ran either. Fix whatever it's complaining about and re-run the *whole* script — don't try to resume partway through, since `create table` and the seed `insert` statements aren't safe to re-run individually without adjustment (see the warning at the top of that file).

### 1.3 Get your API credentials

Dashboard → **Project Settings → API**. You need two values for later:
- **Project URL** (looks like `https://abcdefgh.supabase.co`)
- **anon / public key** (a long string starting with `eyJ...`)

Keep this tab open, you'll need these in Part 2.

---

## Part 2 — Run it locally and verify the database connection

Do this before deploying anywhere — it's much easier to debug a connection problem on your own machine than on a live server.

```bash
git clone https://github.com/shilmypx/asset-management.git
cd asset-management
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in the two values from step 1.3:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

Open `http://localhost:5173`. You should land on the **login screen** (not the dashboard — that's expected, since there's no user account yet). If you see a login screen instead of an error page, the database connection works. Move to Part 3 to actually get in.

---

## Part 3 — Create your first admin user

Credentials and app data are deliberately split (see the README's RBAC section for why) — creating a working login takes two steps, not one.

### 3.1 Create the login credential

Supabase dashboard → **Authentication → Users → Add user → Create new user**.
- Enter an email and a password (or use "Send invite" to email them a password-setup link instead).
- Note the exact email you used — it has to match exactly in the next step.

### 3.2 Create the matching app profile

Since you don't have an admin account yet to use the in-app Users screen, do this one directly in the SQL editor:

```sql
-- Run in Supabase SQL Editor. Replace the email/username with your own.
insert into users (username, email, status)
values ('your.name', 'your.email@company.com', 'active');

-- Give this user the built-in System Admin role (bypasses the permission
-- matrix entirely — see db/rls-policies.sql's is_system_role note)
insert into user_roles (user_id, role_id, company_id)
select u.id, r.id, null
from users u, roles r
where u.email = 'your.email@company.com' and r.name = 'System Admin';
```

### 3.3 Log in

Back in the app (`http://localhost:5173`), sign in with the email/password from 3.1. You should land on the Dashboard with full access. From here, use the in-app **Users** and **Roles & Permission Matrix** screens (under System Admin) to create everyone else properly instead of writing more SQL by hand.

*(Optional but recommended)* Link this user to an actual Employee record — create yourself in the Employees screen, then edit the `users` row's `employee_id` to point at it (there's no UI for this specific link yet, so it's another one-time SQL step: `update users set employee_id = '<employee-uuid>' where email = '...'`). This makes Self-Service show "Signed in as [your name]" instead of a fallback picker.

---

## Part 4 — Deploy the frontend (Vercel)

1. Push any local changes to GitHub if you haven't already.
2. Go to [vercel.com/new](https://vercel.com/new) → import the `shilmypx/asset-management` repo.
3. Vercel auto-detects it's a Vite app — no build config changes needed.
4. Before deploying, add the environment variables (**Environment Variables** section on the import screen, or Project Settings → Environment Variables after):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same two values as `.env.local`)
5. Click **Deploy**. Takes about a minute.
6. Visit the URL Vercel gives you — you should see the same login screen, now live on the internet.

**You now have a working, live, multi-user system.** Parts 5 and 6 below are genuinely optional — the app is fully usable without them, just with three specific features inactive (scheduled backups, HR auto-sync, and automated renewal alerts).

---

## Part 5 — Optional: server-side automation

These three features have real code already written, but none of it activates on its own — each needs a one-time deployment step because each does something a browser can't (verify a webhook's authenticity, run on a schedule, or shell out to `pg_dump`). Skip any you don't need yet; you can come back and do this later without touching anything else.

You'll need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in (`supabase login`) for all three.

### 5.1 Automation rules (warranty/contract/license alerts)

```bash
supabase functions deploy run-automation-rules
```

Then in the SQL editor, run `db/schedule-automation.sql` (fill in your project ref and key first — instructions are in the file's own comments) to schedule it daily.

### 5.2 HR sync webhook

Only needed if an external HR system will push employee changes to ITAMS automatically.

```bash
supabase functions deploy hr-sync-webhook --no-verify-jwt
```

The `--no-verify-jwt` flag is intentional — the HR system authenticates via a signed request, not a Supabase login. See the function's header comment for the exact request format and where the signing secret comes from.

### 5.3 Database backups (pg_dump → OneDrive)

The most involved of the three, because it needs a real Linux environment with `pg_dump` — GitHub Actions provides that; Supabase's Edge Functions (which run on Deno) can't. Supabase's only role here is holding your schedule/folder settings and providing a small trigger for the "Backup now" button.

1. **Deploy the trigger function:**
   ```bash
   supabase functions deploy trigger-instant-backup
   supabase secrets set GITHUB_PAT=<a fine-grained token, Actions:write, scoped to this repo only>
   supabase secrets set GITHUB_REPO=shilmypx/asset-management
   ```
2. **Register an Azure AD app** for OneDrive access (Azure Portal → App registrations → New registration). Add the **Files.ReadWrite.All** *application* permission (not delegated) and grant admin consent. Note the Application (client) ID, Directory (tenant) ID, and generate a client secret.
3. **Add these as GitHub repo secrets** (this repo → Settings → Secrets and variables → Actions):
   - `DATABASE_URL` — Supabase → Project Settings → Database → Connection string (use the pooler/URI form)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API — the *service role* key, not the anon key)
   - `ONEDRIVE_TENANT_ID`, `ONEDRIVE_CLIENT_ID`, `ONEDRIVE_CLIENT_SECRET` — from step 2
   - `ONEDRIVE_USER_ID` — the UPN of the OneDrive account backups should land in
   - `RESEND_API_KEY`, `FAILURE_EMAIL_FROM` — for the failure-notification email
4. In the app, go to **Configuration → Database Backup** and set the schedule, folder path, and failure-notification email addresses. The client ID/tenant ID fields there are for your own reference only — the actual secret lives only in the GitHub repo secret from step 3, never in the database.

---

## Part 6 — Go-live checklist

Before pointing real users at it:

- [ ] `db/00-complete-setup.sql` ran with no errors (Part 1.2)
- [ ] You can log in and see the Dashboard (Part 3.3)
- [ ] Vercel deployment is live and shows the same login screen (Part 4)
- [ ] You've created the real companies/org units/departments/locations that match your actual organization (System Admin screens) — the seeded Karawa/O2 Café/Joy/JOT Events data is a demo dataset, not something to keep as-is
- [ ] You've set up at least one more role beyond System Admin (e.g. "IT Technician") via **Roles & Permission Matrix**, and confirmed a test user with that role sees a correctly restricted set of screens and buttons
- [ ] You've decided whether Parts 5.1–5.3 matter for your rollout, and either done them or consciously deferred them
- [ ] `.env.local` and any secrets are *not* committed to git (check `.gitignore` covers them — it does by default in this repo)

## Troubleshooting

**"Loading…" forever on the login screen** — usually a wrong or missing `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Double-check Part 1.3's values made it into `.env.local` (local) or Vercel's environment variables (deployed) exactly, no extra quotes or spaces.

**Logged in, but every screen shows "Demo data"** — same cause as above; the app falls back to demo/mock mode whenever it can't detect valid Supabase credentials, by design, rather than crashing.

**Logged in, but every button is disabled / nav is nearly empty** — expected if your user has no role assigned yet, or a role with no permissions checked. Go to **Roles & Permission Matrix** (as an admin) and check the boxes for that role, or assign the System Admin role via the SQL in Part 3.2 for a full-access account.

**"row-level security policy" error when saving something** — this is Postgres correctly blocking a write your role doesn't have permission for. Not a bug — check the Roles & Permission Matrix for that module/action.
