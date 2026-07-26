import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type RepairStatus = "sent" | "in_progress" | "completed" | "cancelled";

export type RepairRecord = {
  id: string;
  asset_id: string;
  asset_tag?: string;
  asset_name?: string;
  issue_description: string;
  vendor_name?: string | null;
  sent_date: string;
  estimated_return_date: string | null;
  actual_return_date: string | null;
  repair_cost: number | null;
  under_warranty: boolean;
  status: RepairStatus;
};

export type Replacement = { id: string; repair_record_id: string; replacement_asset_id: string | null; replacement_source: "warranty_vendor" | "internal_stock"; issued_at: string; recovered_at: string | null };

const MOCK_REPAIRS: RepairRecord[] = [
  { id: "rep1", asset_id: "AST-00232", asset_tag: "KWA-LAP-00232", asset_name: "MacBook Pro 14", issue_description: "Battery swelling, won't hold charge", vendor_name: "Apple Authorized Service", sent_date: "2026-07-24", estimated_return_date: "2026-08-05", actual_return_date: null, repair_cost: null, under_warranty: true, status: "in_progress" },
];
const MOCK_REPLACEMENTS: Record<string, Replacement[]> = {
  rep1: [{ id: "rp1", repair_record_id: "rep1", replacement_asset_id: "AST-00098", replacement_source: "internal_stock", issued_at: "2026-07-24", recovered_at: null }],
};

export async function fetchRepairs(): Promise<RepairRecord[]> {
  if (!isSupabaseConfigured) return MOCK_REPAIRS;
  const { data, error } = await supabase
    .from("repair_records")
    .select("id, asset_id, issue_description, sent_date, estimated_return_date, actual_return_date, repair_cost, under_warranty, status, vendors(name), assets(asset_number, barcode)")
    .order("sent_date", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({
    ...r, vendor_name: r.vendors?.name ?? null, asset_tag: r.assets?.barcode ?? r.assets?.asset_number, asset_name: r.assets?.asset_number,
  }));
}

export async function fetchReplacements(repairId: string): Promise<Replacement[]> {
  if (!isSupabaseConfigured) return MOCK_REPLACEMENTS[repairId] ?? [];
  const { data, error } = await supabase.from("repair_replacements").select("*").eq("repair_record_id", repairId);
  if (error) throw error;
  return data as Replacement[];
}

export async function createRepair(input: { asset_id: string; issue_description: string; under_warranty: boolean; statusIdUnderRepair: string }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data: repair, error } = await supabase
    .from("repair_records")
    .insert({ asset_id: input.asset_id, issue_description: input.issue_description, under_warranty: input.under_warranty, sent_date: new Date().toISOString().slice(0, 10), status: "sent" })
    .select()
    .single();
  if (error) throw error;

  const { error: assetError } = await supabase.from("assets").update({ status_id: input.statusIdUnderRepair }).eq("id", input.asset_id);
  if (assetError) throw assetError;

  return repair;
}

/** Issuing a replacement: the replacement asset takes over the original's assignment while the original is out. */
export async function issueReplacement(repairId: string, originalAssetId: string, replacementAssetId: string, source: "warranty_vendor" | "internal_stock", assignedStatusId: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");

  const { data: original, error: origError } = await supabase.from("assets").select("current_owner_type, current_owner_id").eq("id", originalAssetId).single();
  if (origError) throw origError;

  const { error: replError } = await supabase.from("repair_replacements").insert({
    repair_record_id: repairId, replacement_asset_id: source === "internal_stock" ? replacementAssetId : null,
    replacement_source: source, issued_at: new Date().toISOString(),
  });
  if (replError) throw replError;

  if (source === "internal_stock") {
    const { error: assetError } = await supabase
      .from("assets")
      .update({ current_owner_type: original.current_owner_type, current_owner_id: original.current_owner_id, status_id: assignedStatusId })
      .eq("id", replacementAssetId);
    if (assetError) throw assetError;
  }
}

/** Marks the repair complete: original asset comes back, any internal-stock replacement is auto-recovered. */
export async function completeRepair(repairId: string, originalAssetId: string, availableStatusId: string, repairCost: number | null) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");

  const { error: repairError } = await supabase
    .from("repair_records")
    .update({ status: "completed", actual_return_date: new Date().toISOString().slice(0, 10), repair_cost: repairCost })
    .eq("id", repairId);
  if (repairError) throw repairError;

  const { error: assetError } = await supabase.from("assets").update({ status_id: availableStatusId }).eq("id", originalAssetId);
  if (assetError) throw assetError;

  const { data: replacements, error: findError } = await supabase
    .from("repair_replacements")
    .select("id, replacement_asset_id")
    .eq("repair_record_id", repairId)
    .is("recovered_at", null);
  if (findError) throw findError;

  for (const r of (replacements as any[])) {
    await supabase.from("repair_replacements").update({ recovered_at: new Date().toISOString() }).eq("id", r.id);
    if (r.replacement_asset_id) {
      await supabase.from("assets").update({ current_owner_type: null, current_owner_id: null, status_id: availableStatusId }).eq("id", r.replacement_asset_id);
    }
  }
}
