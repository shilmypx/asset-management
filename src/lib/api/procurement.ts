import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type POStatus = "draft" | "pending_approval" | "approved" | "ordered" | "received" | "closed" | "cancelled";

export type PurchaseOrder = {
  id: string;
  po_number: string;
  company_id: string;
  company_name?: string;
  vendor_name: string | null;
  status: POStatus;
  total_cost: number | null;
  created_at: string;
};

export type POLine = {
  id: string;
  po_id: string;
  description: string;
  quantity: number;
  unit_cost: number | null;
  received_asset_id: string | null;
};

const MOCK_POS: PurchaseOrder[] = [
  { id: "po1", po_number: "PO-2026-014", company_id: "karawa", company_name: "Karawa", vendor_name: "Dell Qatar", status: "pending_approval", total_cost: 12500, created_at: "2026-07-20" },
  { id: "po2", po_number: "PO-2026-011", company_id: "o2cafe", company_name: "O2 Café", vendor_name: "Redington Gulf", status: "ordered", total_cost: 4200, created_at: "2026-07-10" },
  { id: "po3", po_number: "PO-2026-009", company_id: "karawa", company_name: "Karawa", vendor_name: "Dell Qatar", status: "closed", total_cost: 8900, created_at: "2026-06-28" },
];
const MOCK_LINES: Record<string, POLine[]> = {
  po1: [{ id: "l1", po_id: "po1", description: "Dell Latitude 5440", quantity: 3, unit_cost: 3450, received_asset_id: null }, { id: "l2", po_id: "po1", description: "Dell P2422H Monitor", quantity: 3, unit_cost: 550, received_asset_id: null }],
  po2: [{ id: "l3", po_id: "po2", description: "HP LaserJet M404", quantity: 2, unit_cost: 1150, received_asset_id: null }],
  po3: [{ id: "l4", po_id: "po3", description: "MacBook Pro 14", quantity: 1, unit_cost: 8900, received_asset_id: "AST-00232" }],
};

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  if (!isSupabaseConfigured) return MOCK_POS;
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id, po_number, company_id, total_cost, status, created_at, companies(name), vendors(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id, po_number: r.po_number, company_id: r.company_id, company_name: r.companies?.name,
    vendor_name: r.vendors?.name ?? null, status: r.status, total_cost: r.total_cost, created_at: r.created_at,
  }));
}

export async function fetchPOLines(poId: string): Promise<POLine[]> {
  if (!isSupabaseConfigured) return MOCK_LINES[poId] ?? [];
  const { data, error } = await supabase.from("purchase_order_lines").select("*").eq("po_id", poId);
  if (error) throw error;
  return data as POLine[];
}

export async function createPurchaseOrder(input: { company_id: string; po_number: string }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("purchase_orders").insert({ ...input, status: "draft" }).select().single();
  if (error) throw error;
  return data;
}

export async function addPOLine(input: { po_id: string; description: string; quantity: number; unit_cost: number }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("purchase_order_lines").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function setPOStatus(poId: string, status: POStatus) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", poId);
  if (error) throw error;
}

/** Receiving a line converts it into a real asset row and links it back — closing the loop from request to inventory. */
export async function receivePOLine(line: POLine, po: PurchaseOrder, categoryId: string, statusId: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const assetNumber = `${po.po_number}-${line.id.slice(0, 6)}`;
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      asset_number: assetNumber,
      category_id: categoryId,
      company_id: po.company_id,
      status_id: statusId,
      cost: line.unit_cost,
      purchase_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (assetError) throw assetError;

  const { error: lineError } = await supabase.from("purchase_order_lines").update({ received_asset_id: asset.id }).eq("id", line.id);
  if (lineError) throw lineError;

  return asset;
}
