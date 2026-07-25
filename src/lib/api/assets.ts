import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { ASSETS, Asset, AssetStatus } from "../mockData";

export async function fetchAssets(): Promise<Asset[]> {
  if (!isSupabaseConfigured) {
    return ASSETS;
  }
  const { data, error } = await supabase.from("v_assets").select("*").order("asset_number");
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id,
    tag: r.barcode ?? r.asset_number,
    category: r.category_name ?? "Uncategorized",
    manufacturer: r.manufacturer_name ?? "",
    model: r.model_name ?? "",
    serial: r.serial_number ?? "—",
    status: (r.status_name ?? "Available") as AssetStatus,
    company: r.company_name ?? "—",
    owner: r.owner_name ?? "Unassigned",
    ownerType: r.current_owner_type ?? "—",
    location: r.location_name ?? "—",
    purchaseDate: r.purchase_date ?? "—",
    cost: r.cost ? `${r.cost} ${r.currency_code ?? ""}`.trim() : "—",
    warrantyEnd: r.warranty_end ?? "—",
    parentId: r.parent_asset_id,
    isBundle: r.is_bundle,
  }));
}
