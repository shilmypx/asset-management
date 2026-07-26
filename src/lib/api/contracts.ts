import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type ContractType = "AMC" | "maintenance" | "support" | "software_agreement" | "vendor_contract";

export type Contract = {
  id: string;
  company_id: string;
  company_name?: string;
  contract_type: ContractType;
  vendor_name?: string | null;
  title: string;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  auto_renew: boolean;
  cost: number | null;
  status: string;
};

export type WarrantyExtension = {
  id: string;
  asset_id: string;
  asset_tag?: string;
  previous_end_date: string | null;
  new_end_date: string;
  cost: number | null;
  purchased_at: string;
};

const MOCK_CONTRACTS: Contract[] = [
  { id: "ct1", company_id: "karawa", company_name: "Karawa", contract_type: "AMC", vendor_name: "Dell Qatar", title: "Server hardware AMC — Doha HQ", start_date: "2026-01-01", end_date: "2026-12-31", renewal_date: "2026-11-01", auto_renew: true, cost: 15000, status: "active" },
  { id: "ct2", company_id: "joy", company_name: "Joy", contract_type: "software_agreement", vendor_name: "Adobe", title: "Adobe Creative Cloud enterprise agreement", start_date: "2025-09-15", end_date: "2026-09-15", renewal_date: "2026-08-15", auto_renew: false, cost: 9600, status: "active" },
  { id: "ct3", company_id: "o2cafe", company_name: "O2 Café", contract_type: "support", vendor_name: "Redington Gulf", title: "POS system support contract", start_date: "2025-05-10", end_date: "2026-05-10", renewal_date: null, auto_renew: false, cost: 3200, status: "expired" },
];
const MOCK_EXTENSIONS: WarrantyExtension[] = [
  { id: "we1", asset_id: "AST-00520", asset_tag: "JOY-SRV-00520", previous_end_date: "2025-09-01", new_end_date: "2027-09-01", cost: 4500, purchased_at: "2025-08-15" },
];

export async function fetchContracts(): Promise<Contract[]> {
  if (!isSupabaseConfigured) return MOCK_CONTRACTS;
  const { data, error } = await supabase
    .from("contracts")
    .select("id, company_id, contract_type, title, start_date, end_date, renewal_date, auto_renew, cost, status, companies(name), vendors(name)")
    .order("renewal_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r, company_name: r.companies?.name, vendor_name: r.vendors?.name ?? null }));
}

export async function createContract(input: { company_id: string; contract_type: ContractType; title: string; end_date: string; renewal_date: string | null; auto_renew: boolean; cost: number }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("contracts").insert({ ...input, status: "active" }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchWarrantyExtensions(): Promise<WarrantyExtension[]> {
  if (!isSupabaseConfigured) return MOCK_EXTENSIONS;
  const { data, error } = await supabase
    .from("warranty_extensions")
    .select("id, asset_id, previous_end_date, new_end_date, cost, purchased_at, assets(barcode, asset_number)")
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r, asset_tag: r.assets?.barcode ?? r.assets?.asset_number }));
}

export async function addWarrantyExtension(input: { asset_id: string; previous_end_date: string | null; new_end_date: string; cost: number }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error: extError } = await supabase.from("warranty_extensions").insert({ ...input, purchased_at: new Date().toISOString().slice(0, 10) });
  if (extError) throw extError;
  // Original warranty_start/warranty_end on the asset is left untouched in
  // the assets table's own history — see db/schema.sql section 4.7 for the
  // reasoning; the extension log is the source of truth for what changed
  // and why, while asset.warranty_end is updated here so the rest of the
  // app (dashboards, expiry filters) reflects current coverage without
  // having to join against warranty_extensions on every read.
  const { error: assetError } = await supabase.from("assets").update({ warranty_end: input.new_end_date }).eq("id", input.asset_id);
  if (assetError) throw assetError;
}
