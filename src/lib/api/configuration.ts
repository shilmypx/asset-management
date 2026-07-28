import { supabase, isSupabaseConfigured } from "../supabaseClient";

/* ---------------- HR Sync ---------------- */
export type HrSyncSettings = {
  id: string;
  mode: "manual" | "api";
  api_endpoint: string | null;
  has_api_key: boolean; // the actual key is never sent to the client after being set
  sync_frequency: string;
  last_synced_at: string | null;
  is_active: boolean;
};

const MOCK_HR_SYNC: HrSyncSettings = { id: "hr1", mode: "manual", api_endpoint: null, has_api_key: false, sync_frequency: "manual", last_synced_at: null, is_active: false };

export async function fetchHrSyncSettings(): Promise<HrSyncSettings> {
  if (!isSupabaseConfigured) return MOCK_HR_SYNC;
  const { data, error } = await supabase.from("hr_sync_settings").select("id, mode, api_endpoint, api_key_encrypted, sync_frequency, last_synced_at, is_active").limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return { ...MOCK_HR_SYNC, id: "" };
  return { id: data.id, mode: data.mode, api_endpoint: data.api_endpoint, has_api_key: Boolean(data.api_key_encrypted), sync_frequency: data.sync_frequency, last_synced_at: data.last_synced_at, is_active: data.is_active };
}

export async function saveHrSyncSettings(input: { id: string; mode: "manual" | "api"; api_endpoint: string | null; api_key: string | null; sync_frequency: string; is_active: boolean }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const payload: any = { mode: input.mode, api_endpoint: input.api_endpoint, sync_frequency: input.sync_frequency, is_active: input.is_active };
  if (input.api_key) payload.api_key_encrypted = input.api_key; // real build: encrypt/hash before storing, or better, keep this in a secrets manager entirely and store only a reference here
  if (input.id) {
    const { error } = await supabase.from("hr_sync_settings").update(payload).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("hr_sync_settings").insert(payload);
    if (error) throw error;
  }
}

/* ---------------- Label / Barcode Print Settings ---------------- */
export type LabelPrintSettings = {
  id: string;
  name: string;
  printer_name: string | null;
  page_width_mm: number;
  page_height_mm: number;
  margin_top_mm: number;
  margin_left_mm: number;
  labels_per_row: number;
  labels_per_column: number;
  label_width_mm: number;
  label_height_mm: number;
  horizontal_spacing_mm: number;
  vertical_spacing_mm: number;
  font_family: string;
  font_size_pt: number;
  barcode_format: "code128" | "qr";
};

const MOCK_LABEL_SETTINGS: LabelPrintSettings = {
  id: "lbl1", name: "Default", printer_name: "Office Label Printer", page_width_mm: 210, page_height_mm: 297,
  margin_top_mm: 10, margin_left_mm: 10, labels_per_row: 3, labels_per_column: 8,
  label_width_mm: 63.5, label_height_mm: 33.9, horizontal_spacing_mm: 2.5, vertical_spacing_mm: 0,
  font_family: "sans-serif", font_size_pt: 8, barcode_format: "code128",
};

export async function fetchLabelSettings(): Promise<LabelPrintSettings> {
  if (!isSupabaseConfigured) return MOCK_LABEL_SETTINGS;
  const { data, error } = await supabase.from("label_print_settings").select("*").eq("is_default", true).limit(1).maybeSingle();
  if (error) throw error;
  return (data as LabelPrintSettings) ?? { ...MOCK_LABEL_SETTINGS, id: "" };
}

export async function saveLabelSettings(input: LabelPrintSettings) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { id, ...payload } = input;
  if (id) {
    const { error } = await supabase.from("label_print_settings").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("label_print_settings").insert({ ...payload, is_default: true });
    if (error) throw error;
  }
}

/* ---------------- Notification Routing ---------------- */
export type NotificationRoute = {
  id: string;
  event_type: string;
  recipient_type: "specific_email" | "role" | "requester_manager";
  recipient_email: string | null;
  recipient_role_id: string | null;
  recipient_role_name?: string;
  channel: "email" | "dashboard" | "both";
  is_active: boolean;
};

const EVENT_TYPES = ["renewal", "warranty_expiry", "maintenance_due", "repair_delays", "assignment", "return", "approval_requests", "audit_due", "contract_expiry", "low_license_availability"];

const MOCK_ROUTES: NotificationRoute[] = EVENT_TYPES.map((e, i) => ({
  id: `route${i}`, event_type: e, recipient_type: i % 3 === 0 ? "role" : "specific_email",
  recipient_email: i % 3 === 0 ? null : "it-alerts@karawa.qa", recipient_role_id: i % 3 === 0 ? "role-admin" : null,
  recipient_role_name: i % 3 === 0 ? "System Admin" : undefined, channel: "email", is_active: true,
}));

export async function fetchNotificationRoutes(): Promise<NotificationRoute[]> {
  if (!isSupabaseConfigured) return MOCK_ROUTES;
  const { data, error } = await supabase.from("notification_routing").select("*, roles(name)").order("event_type");
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r, recipient_role_name: r.roles?.name }));
}

export async function updateNotificationRoute(id: string, changes: Partial<NotificationRoute>) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { recipient_role_name, ...payload } = changes as any;
  const { error } = await supabase.from("notification_routing").update(payload).eq("id", id);
  if (error) throw error;
}

/* ---------------- Approval Rules ---------------- */
export type ApprovalRule = {
  id: string;
  request_type: "purchase_order" | "self_service_request" | "asset_disposal" | "change_request";
  requires_approval: boolean;
  approver_user_id: string | null;
  approver_name?: string;
};

const MOCK_APPROVAL_RULES: ApprovalRule[] = [
  { id: "ap1", request_type: "purchase_order", requires_approval: true, approver_user_id: "u2", approver_name: "Fatima Nasser" },
  { id: "ap2", request_type: "self_service_request", requires_approval: true, approver_user_id: "u2", approver_name: "Fatima Nasser" },
  { id: "ap3", request_type: "asset_disposal", requires_approval: true, approver_user_id: "u2", approver_name: "Fatima Nasser" },
  { id: "ap4", request_type: "change_request", requires_approval: false, approver_user_id: null },
];

export async function fetchApprovalRules(): Promise<ApprovalRule[]> {
  if (!isSupabaseConfigured) return MOCK_APPROVAL_RULES;
  const { data, error } = await supabase.from("approval_rules").select("id, request_type, requires_approval, approver_user_id, users(username)").order("request_type");
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r, approver_name: r.users?.username }));
}

export async function updateApprovalRule(id: string, changes: Partial<Pick<ApprovalRule, "requires_approval" | "approver_user_id">>) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from("approval_rules").update(changes).eq("id", id);
  if (error) throw error;
}
