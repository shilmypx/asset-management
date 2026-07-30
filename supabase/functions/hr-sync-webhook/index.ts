// supabase/functions/hr-sync-webhook/index.ts
//
// The URL shown in Configuration → Integrations when "webhook" sync is
// selected. The HR system POSTs here whenever an employee is added,
// changed, or terminated — no polling, no waiting for a scheduled pull.
//
// Deploy: supabase functions deploy hr-sync-webhook --no-verify-jwt
// (--no-verify-jwt because the HR system isn't a Supabase Auth user —
// it authenticates via the HMAC signature below instead.)
//
// Expected request:
//   POST /functions/v1/hr-sync-webhook
//   Header: X-Signature: hex-encoded HMAC-SHA256 of the raw body,
//           signed with the webhook_secret from hr_sync_settings
//   Body:
//   {
//     "event": "employee.created" | "employee.updated" | "employee.terminated",
//     "employee": {
//       "employee_number": "EMP-4029",   // required — used to match existing records
//       "first_name": "...", "last_name": "...", "email": "...",
//       "phone": "...", "designation": "...",
//       "company_code": "KWA",            // matched against companies.code
//       "department_code": "IT",          // matched against departments.code
//       "employment_type": "Full-Time",   // matched against employment_types.name
//       "joining_date": "2024-01-15",
//       "termination_date": null,
//       "status": "active"
//     }
//   }
//
// This is intentionally a starting contract, not a negotiated HR-vendor
// spec — whoever's HR system this connects to will very likely need the
// field mapping adjusted here to match what that system actually sends.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get("X-Signature");
  if (!signature) return jsonError("Missing X-Signature header.", 401);

  const { data: settings, error: settingsError } = await supabase
    .from("hr_sync_settings")
    .select("id, webhook_secret, is_active")
    .limit(1)
    .maybeSingle();
  if (settingsError || !settings?.webhook_secret) return jsonError("Webhook not configured.", 500);
  if (!settings.is_active) return jsonError("HR sync is currently disabled in Configuration.", 403);

  const expectedSignature = await hmacHex(settings.webhook_secret, rawBody);
  if (!timingSafeEqual(signature, expectedSignature)) return jsonError("Invalid signature.", 401);

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const emp = payload.employee;
  if (!emp?.employee_number) return jsonError("employee.employee_number is required.", 400);

  const companyId = emp.company_code ? await lookupId("companies", "code", emp.company_code) : null;
  const departmentId = emp.department_code ? await lookupId("departments", "code", emp.department_code) : null;
  const employmentTypeId = emp.employment_type ? await lookupId("employment_types", "name", emp.employment_type) : null;

  const record = {
    employee_number: emp.employee_number,
    first_name: emp.first_name,
    last_name: emp.last_name,
    email: emp.email,
    phone: emp.phone ?? null,
    designation: emp.designation ?? null,
    company_id: companyId,
    department_id: departmentId,
    employment_type_id: employmentTypeId,
    joining_date: emp.joining_date ?? null,
    termination_date: emp.termination_date ?? null,
    status: emp.status ?? (payload.event === "employee.terminated" ? "terminated" : "active"),
  };

  const { error: upsertError } = await supabase
    .from("employees")
    .upsert(record, { onConflict: "employee_number" });
  if (upsertError) return jsonError(`Failed to upsert employee: ${upsertError.message}`, 500);

  await supabase.from("hr_sync_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", settings.id);

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});

async function lookupId(table: string, column: string, value: string): Promise<string | null> {
  const { data } = await supabase.from(table).select("id").eq(column, value).maybeSingle();
  return data?.id ?? null;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { "Content-Type": "application/json" } });
}
