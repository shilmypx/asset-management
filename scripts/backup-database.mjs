#!/usr/bin/env node
// scripts/backup-database.mjs
//
// Run by .github/workflows/database-backup.yml. Does the actual work
// none of Supabase's runtimes can do on their own:
//   1. Checks backup_settings to decide whether it's actually time to
//      run (skipped when triggered manually with FORCE_RUN=true).
//   2. pg_dump's the database.
//   3. Uploads the dump to OneDrive via Microsoft Graph, using a
//      resumable upload session (a plain PUT only works up to 4MB;
//      real database dumps will usually be bigger than that).
//   4. Records the result in backup_runs / backup_settings.
//   5. On any failure, emails backup_settings.failure_notification_emails
//      via Resend, and exits non-zero so the GitHub Actions run itself
//      also shows red — the email is a convenience, not the only signal.
//
// Required env vars (set as GitHub repo secrets, referenced in the
// workflow — see .github/workflows/database-backup.yml):
//   DATABASE_URL                Postgres connection string (Supabase → Project Settings → Database → Connection string, "URI", use the pooler connection for reliability)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   used to read/write backup_settings and backup_runs — bypasses RLS, which is correct here since this runs server-side, never in a browser
//   ONEDRIVE_TENANT_ID
//   ONEDRIVE_CLIENT_ID
//   ONEDRIVE_CLIENT_SECRET      Azure App Registration client secret — application permissions Files.ReadWrite.All, admin consent granted
//   ONEDRIVE_USER_ID            the UPN or object ID of the OneDrive account backups go to (app-only Graph auth uploads to a specific user's drive, not "me")
//   RESEND_API_KEY              for the failure email
//   FAILURE_EMAIL_FROM          e.g. "itams-backups@yourdomain.com" — must be a domain verified in Resend
//
// Optional:
//   FOLDER_OVERRIDE             one-off destination for this run only (Instant Backup's "select a location" picker) — not persisted to backup_settings

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, stat, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

const {
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ONEDRIVE_TENANT_ID,
  ONEDRIVE_CLIENT_ID,
  ONEDRIVE_CLIENT_SECRET,
  ONEDRIVE_USER_ID,
  RESEND_API_KEY,
  FAILURE_EMAIL_FROM,
  FORCE_RUN, // "true" when triggered manually via workflow_dispatch (Instant Backup button)
  FOLDER_OVERRIDE, // one-off destination folder from Instant Backup's location picker — takes priority over backup_settings.onedrive_folder_path for this run only, never persisted
} = process.env;

function requireEnv(vars) {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}
requireEnv([
  "DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
  "ONEDRIVE_TENANT_ID", "ONEDRIVE_CLIENT_ID", "ONEDRIVE_CLIENT_SECRET", "ONEDRIVE_USER_ID",
  "RESEND_API_KEY", "FAILURE_EMAIL_FROM",
]);

const sb = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });

async function getSettings() {
  const res = await sb("backup_settings?select=*&limit=1");
  const rows = await res.json();
  if (!rows.length) throw new Error("No row in backup_settings — run db/backup-schema.sql first.");
  return rows[0];
}

function shouldRunNow(settings) {
  if (FORCE_RUN === "true") return true;
  if (!settings.is_enabled) return false;

  const now = new Date();
  const last = settings.last_backup_at ? new Date(settings.last_backup_at) : null;
  const hoursSince = last ? (now.getTime() - last.getTime()) / 3600000 : Infinity;

  if (settings.frequency === "every_4_hours") return hoursSince >= 4;

  // For daily/weekly/monthly: only run within the same hour as
  // scheduled_time, and only once (guarded by hoursSince >= 20 so an
  // hourly cron doesn't fire twice inside the same scheduled hour).
  const [schedH] = (settings.scheduled_time ?? "02:00").split(":").map(Number);
  const withinScheduledHour = now.getUTCHours() === schedH;
  if (!withinScheduledHour) return false;

  if (settings.frequency === "daily") return hoursSince >= 20;
  if (settings.frequency === "weekly") return now.getUTCDay() === (settings.day_of_week ?? 0) && hoursSince >= 20;
  if (settings.frequency === "monthly") return now.getUTCDate() === (settings.day_of_month ?? 1) && hoursSince >= 20;
  return false;
}

async function insertRun(triggerType) {
  const res = await sb("backup_runs", {
    method: "POST",
    body: JSON.stringify({ status: "running", trigger_type: triggerType }),
  });
  const [row] = await res.json();
  return row.id;
}

async function updateRun(id, changes) {
  await sb(`backup_runs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

async function updateSettings(changes) {
  const settings = await getSettings();
  await sb(`backup_settings?id=eq.${settings.id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

async function dumpDatabase(filePath) {
  await execFileAsync("pg_dump", [DATABASE_URL, "--format=custom", "--file", filePath], { maxBuffer: 1024 * 1024 * 50 });
}

async function getGraphToken() {
  const res = await fetch(`https://login.microsoftonline.com/${ONEDRIVE_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ONEDRIVE_CLIENT_ID,
      client_secret: ONEDRIVE_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Microsoft Graph auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

/** Resumable upload — required for anything over 4MB, which a real DB dump will usually be. */
async function uploadToOneDrive(filePath, folderPath, fileName, token) {
  const graphPath = `${folderPath.replace(/\/$/, "")}/${fileName}`;
  const sessionRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${ONEDRIVE_USER_ID}/drive/root:${graphPath}:/createUploadSession`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } }),
    }
  );
  if (!sessionRes.ok) throw new Error(`Failed to create OneDrive upload session: ${sessionRes.status} ${await sessionRes.text()}`);
  const { uploadUrl } = await sessionRes.json();

  const fileStat = await stat(filePath);
  const fileBuffer = await readFile(filePath);
  const chunkSize = 10 * 1024 * 1024; // 10MB chunks, Graph's recommended size
  for (let start = 0; start < fileStat.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, fileStat.size) - 1;
    const chunkRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
      },
      body: fileBuffer.subarray(start, end + 1),
    });
    if (!chunkRes.ok && chunkRes.status !== 202) {
      throw new Error(`OneDrive chunk upload failed at byte ${start}: ${chunkRes.status} ${await chunkRes.text()}`);
    }
  }
  return graphPath;
}

async function sendFailureEmail(recipients, errorMessage) {
  if (!recipients?.length) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FAILURE_EMAIL_FROM,
      to: recipients,
      subject: "ITAMS database backup failed",
      text: `The scheduled database backup failed at ${new Date().toISOString()}.\n\nError:\n${errorMessage}\n\nCheck the GitHub Actions run for the full log.`,
    }),
  });
}

async function main() {
  const settings = await getSettings();
  if (!shouldRunNow(settings)) {
    console.log("Not due yet — skipping. (Frequency:", settings.frequency, ", last run:", settings.last_backup_at, ")");
    return;
  }

  const triggerType = FORCE_RUN === "true" ? "manual" : "scheduled";
  const runId = await insertRun(triggerType);
  const fileName = `itams-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  const tmpPath = `/tmp/${randomUUID()}-${fileName}`;

  try {
    console.log("Running pg_dump…");
    await dumpDatabase(tmpPath);

    console.log("Authenticating with Microsoft Graph…");
    const token = await getGraphToken();

    console.log("Uploading to OneDrive…");
    const targetFolder = FOLDER_OVERRIDE?.trim() || settings.onedrive_folder_path;
    const onedrivePath = await uploadToOneDrive(tmpPath, targetFolder, fileName, token);

    const fileSize = (await stat(tmpPath)).size;
    await updateRun(runId, { status: "success", completed_at: new Date().toISOString(), file_name: fileName, onedrive_path: onedrivePath });
    await updateSettings({ last_backup_at: new Date().toISOString(), last_backup_status: "success", last_backup_file_name: fileName, last_backup_message: null });
    console.log(`Backup complete: ${onedrivePath} (${fileSize} bytes)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Backup failed:", message);
    await updateRun(runId, { status: "failed", completed_at: new Date().toISOString(), error_message: message });
    await updateSettings({ last_backup_status: "failed", last_backup_message: message });
    await sendFailureEmail(settings.failure_notification_emails, message);
    process.exitCode = 1;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

main();
