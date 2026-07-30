// supabase/functions/trigger-instant-backup/index.ts
//
// Called from the Configuration → Database Backup page's "Backup now"
// button. Does NOT run the backup itself (no pg_dump binary here) — it
// verifies the caller is allowed to trigger one, then fires a
// workflow_dispatch event on .github/workflows/database-backup.yml,
// which does the actual work.
//
// Deploy: supabase functions deploy trigger-instant-backup
// Secrets needed (supabase secrets set):
//   GITHUB_PAT           - fine-grained token, Actions: write, scoped to this repo only
//   GITHUB_REPO          - "owner/repo", e.g. "shilmypx/asset-management"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const githubPat = Deno.env.get("GITHUB_PAT")!;
const githubRepo = Deno.env.get("GITHUB_REPO")!;

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonError("Not signed in.", 401);
  }

  // Verify the caller's identity and permission using THEIR OWN token,
  // not the service role — this means RLS and has_permission() apply
  // exactly as they would for any other request that user makes, rather
  // than trusting the Edge Function's own judgment about who's an admin.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonError("Invalid session.", 401);
  }

  const { data: allowed, error: permError } = await callerClient.rpc("has_permission", {
    target_module: "settings",
    target_action: "edit",
  });
  if (permError || !allowed) {
    return jsonError("You don't have permission to trigger a backup.", 403);
  }

  let folderOverride: string | undefined;
  try {
    const body = await req.json();
    folderOverride = typeof body?.folder_path === "string" && body.folder_path.trim() ? body.folder_path.trim() : undefined;
  } catch {
    // no body / not JSON — fine, instant backup just uses the configured folder
  }

  const githubResponse = await fetch(
    `https://api.github.com/repos/${githubRepo}/actions/workflows/database-backup.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { trigger_type: "manual", ...(folderOverride ? { folder_override: folderOverride } : {}) },
      }),
    }
  );

  if (!githubResponse.ok) {
    const text = await githubResponse.text();
    return jsonError(`GitHub API rejected the trigger: ${githubResponse.status} ${text}`, 502);
  }

  return new Response(JSON.stringify({ ok: true, message: "Backup triggered — check Backup History in a minute." }), {
    headers: { "Content-Type": "application/json" },
  });
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
