import { supabase, isSupabaseConfigured } from "../supabaseClient";

const NETWORK_CATEGORIES = ["Router", "Firewall", "Switch", "Server", "Access Point", "NAS", "Patch Panel"];

export type NetworkDetail = {
  asset_id: string;
  ip_address: string | null;
  mac_address: string | null;
  firmware_version: string | null;
  os: string | null;
  port_count: number | null;
  rack_name?: string | null;
};

export type Relationship = { id: string; source_asset_id: string; source_name?: string; target_asset_id: string; target_name?: string; relationship_type: string };

const MOCK_DETAILS: Record<string, NetworkDetail> = {
  "AST-00520": { asset_id: "AST-00520", ip_address: "10.10.2.15", mac_address: "AC:1F:6B:33:9C:02", firmware_version: "iLO 5 v2.78", os: "ESXi 8.0", port_count: 4, rack_name: "Rack 3" },
  "AST-00611": { asset_id: "AST-00611", ip_address: "10.10.0.1", mac_address: "00:1A:2B:3C:4D:5E", firmware_version: "IOS-XE 17.9", os: null, port_count: 24, rack_name: "Rack 1" },
};

const MOCK_RELATIONSHIPS: Relationship[] = [
  { id: "rel1", source_asset_id: "AST-00520", source_name: "ProLiant DL380", target_asset_id: "AST-00611", target_name: "Cisco ISR 4331", relationship_type: "connected_to" },
];

export function isNetworkCategory(category: string) {
  return NETWORK_CATEGORIES.includes(category);
}

export async function fetchNetworkDetails(assetIds: string[]): Promise<Record<string, NetworkDetail>> {
  if (!isSupabaseConfigured) return MOCK_DETAILS;
  if (assetIds.length === 0) return {};
  const { data, error } = await supabase
    .from("network_asset_details")
    .select("asset_id, ip_address, mac_address, firmware_version, os, port_count, racks(name)")
    .in("asset_id", assetIds);
  if (error) throw error;
  const map: Record<string, NetworkDetail> = {};
  (data as any[]).forEach((r) => {
    map[r.asset_id] = { ...r, rack_name: r.racks?.name ?? null };
  });
  return map;
}

export async function fetchRelationships(assetId: string): Promise<Relationship[]> {
  if (!isSupabaseConfigured) return MOCK_RELATIONSHIPS.filter((r) => r.source_asset_id === assetId || r.target_asset_id === assetId);
  const { data, error } = await supabase
    .from("asset_relationships")
    .select("id, source_asset_id, target_asset_id, relationship_type, source:assets!source_asset_id(asset_number), target:assets!target_asset_id(asset_number)")
    .or(`source_asset_id.eq.${assetId},target_asset_id.eq.${assetId}`);
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id, source_asset_id: r.source_asset_id, target_asset_id: r.target_asset_id,
    relationship_type: r.relationship_type, source_name: r.source?.asset_number, target_name: r.target?.asset_number,
  }));
}

export async function fetchAllRelationships(): Promise<Relationship[]> {
  if (!isSupabaseConfigured) return MOCK_RELATIONSHIPS;
  const { data, error } = await supabase
    .from("asset_relationships")
    .select("id, source_asset_id, target_asset_id, relationship_type, source:assets!source_asset_id(asset_number), target:assets!target_asset_id(asset_number)");
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id, source_asset_id: r.source_asset_id, target_asset_id: r.target_asset_id,
    relationship_type: r.relationship_type, source_name: r.source?.asset_number, target_name: r.target?.asset_number,
  }));
}

export async function createRelationship(sourceId: string, targetId: string, type: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from("asset_relationships").insert({ source_asset_id: sourceId, target_asset_id: targetId, relationship_type: type });
  if (error) throw error;
}
