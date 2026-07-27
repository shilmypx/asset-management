// supabase/functions/run-automation-rules/index.ts
//
// Runs on a schedule (see db/schedule-automation.sql for the pg_cron setup)
// and evaluates every active row in `automation_rules` against current
// data, inserting `notifications` rows for anything due. This is the piece
// a frontend genuinely cannot do on its own — it needs the service role
// key (server-side only) and a scheduler, not a client-side setInterval.
//
// Deploy: supabase functions deploy run-automation-rules
// Test locally: supabase functions serve run-automation-rules

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async () => {
  const { data: rules, error: rulesError } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("is_active", true);
  if (rulesError) return jsonError(rulesError.message);

  const results: Record<string, number> = {};

  for (const rule of rules ?? []) {
    const dueItems = await findDueItems(rule.trigger_event);
    results[rule.trigger_event] = dueItems.length;

    for (const item of dueItems) {
      if (rule.action === "send_notification") {
        await supabase.from("notifications").insert({
          type: mapTriggerToNotificationType(rule.trigger_event),
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          channel: "dashboard",
          trigger_offset_days: item.days_remaining,
        });
      }
      // create_task / change_status / create_disposal_request: intentionally
      // not implemented here — each needs its own target table (e.g. a
      // `tasks` table doesn't exist yet in db/schema.sql) and should be
      // added deliberately, not stubbed out to look done when it isn't.
    }
  }

  return new Response(JSON.stringify({ ok: true, evaluated: results }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function findDueItems(trigger: string): Promise<{ entity_type: string; entity_id: string; days_remaining: number }[]> {
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  if (trigger === "warranty_expiring") {
    const { data } = await supabase.from("assets").select("id, warranty_end").not("warranty_end", "is", null).lte("warranty_end", in30Days).gte("warranty_end", today);
    return (data ?? []).map((a) => ({ entity_type: "asset", entity_id: a.id, days_remaining: daysBetween(today, a.warranty_end) }));
  }
  if (trigger === "contract_expiring") {
    const { data } = await supabase.from("contracts").select("id, renewal_date").not("renewal_date", "is", null).lte("renewal_date", in30Days).gte("renewal_date", today).eq("status", "active");
    return (data ?? []).map((c) => ({ entity_type: "contract", entity_id: c.id, days_remaining: daysBetween(today, c.renewal_date) }));
  }
  if (trigger === "license_threshold_reached") {
    const { data } = await supabase.from("software_licenses").select("id, seats_purchased, seats_used");
    return (data ?? [])
      .filter((l) => l.seats_purchased > 0 && l.seats_used / l.seats_purchased >= 0.9)
      .map((l) => ({ entity_type: "software_license", entity_id: l.id, days_remaining: 0 }));
  }
  // repair_returned, asset_idle, disposal_due: left for a follow-up pass —
  // each needs a clearer business rule (e.g. "idle" isn't defined anywhere
  // yet: idle since last checkout? since last audit scan?) rather than a
  // guessed threshold.
  return [];
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function mapTriggerToNotificationType(trigger: string) {
  if (trigger === "warranty_expiring") return "warranty";
  if (trigger === "contract_expiring") return "renewal";
  if (trigger === "license_threshold_reached") return "renewal";
  return "renewal";
}

function jsonError(message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
}
