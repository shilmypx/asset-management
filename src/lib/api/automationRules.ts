import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type TriggerEvent = "warranty_expiring" | "contract_expiring" | "repair_returned" | "license_threshold_reached" | "asset_idle" | "disposal_due";
export type RuleAction = "send_notification" | "create_task" | "change_status" | "create_disposal_request";

export type AutomationRule = { id: string; name: string; trigger_event: TriggerEvent; action: RuleAction; is_active: boolean };

const MOCK_RULES: AutomationRule[] = [
  { id: "ar1", name: "Warranty expiring — notify IT", trigger_event: "warranty_expiring", action: "send_notification", is_active: true },
  { id: "ar2", name: "Contract renewal reminder", trigger_event: "contract_expiring", action: "send_notification", is_active: true },
  { id: "ar3", name: "Auto-flag idle assets for disposal review", trigger_event: "asset_idle", action: "create_task", is_active: false },
];

export async function fetchRules(): Promise<AutomationRule[]> {
  if (!isSupabaseConfigured) return MOCK_RULES;
  const { data, error } = await supabase.from("automation_rules").select("id, name, trigger_event, action, is_active").order("name");
  if (error) throw error;
  return data as AutomationRule[];
}

export async function createRule(input: { name: string; trigger_event: TriggerEvent; action: RuleAction }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("automation_rules").insert({ ...input, is_active: true }).select().single();
  if (error) throw error;
  return data;
}

export async function toggleRule(id: string, active: boolean) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from("automation_rules").update({ is_active: active }).eq("id", id);
  if (error) throw error;
}
