import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type LookupTable =
  | "manufacturers" | "asset_categories" | "asset_statuses" | "license_types"
  | "subscription_types" | "currencies" | "employment_types" | "vendors";

export type LookupRow = {
  id: string;
  name: string;
  code?: string | null;
  sort_order?: number;
  is_active?: boolean;
  allow_depreciation?: boolean; // asset_categories only
};

const MOCK: Record<LookupTable, LookupRow[]> = {
  manufacturers: [
    { id: "m1", name: "Dell", is_active: true }, { id: "m2", name: "Apple", is_active: true },
    { id: "m3", name: "HP", is_active: true }, { id: "m4", name: "Cisco", is_active: true },
    { id: "m5", name: "Lenovo", is_active: true }, { id: "m6", name: "HPE", is_active: true },
  ],
  asset_categories: [
    { id: "c1", name: "Laptop", allow_depreciation: true, is_active: true },
    { id: "c2", name: "Desktop", allow_depreciation: true, is_active: true },
    { id: "c3", name: "Server", allow_depreciation: true, is_active: true },
    { id: "c4", name: "Monitor", allow_depreciation: true, is_active: true },
    { id: "c5", name: "Printer", allow_depreciation: true, is_active: true },
    { id: "c6", name: "Router", allow_depreciation: true, is_active: true },
    { id: "c7", name: "Keyboard", allow_depreciation: false, is_active: true },
    { id: "c8", name: "Mouse", allow_depreciation: false, is_active: true },
    { id: "c9", name: "Bundle", allow_depreciation: true, is_active: true },
  ],
  asset_statuses: [
    { id: "s1", name: "Available", is_active: true }, { id: "s2", name: "Assigned", is_active: true },
    { id: "s3", name: "Under Repair", is_active: true }, { id: "s4", name: "Reserved", is_active: true },
    { id: "s5", name: "Disposed", is_active: true }, { id: "s6", name: "Lost", is_active: true },
    { id: "s7", name: "Damaged", is_active: true },
  ],
  license_types: [
    { id: "l1", name: "Per User", is_active: true }, { id: "l2", name: "Per Seat", is_active: true },
    { id: "l3", name: "Concurrent", is_active: true }, { id: "l4", name: "Site License", is_active: true },
  ],
  subscription_types: [
    { id: "sub1", name: "Monthly", is_active: true }, { id: "sub2", name: "Annual", is_active: true },
    { id: "sub3", name: "One-Time Perpetual", is_active: true },
  ],
  currencies: [
    { id: "cur1", name: "Qatari Riyal", code: "QAR", is_active: true },
    { id: "cur2", name: "US Dollar", code: "USD", is_active: true },
  ],
  employment_types: [
    { id: "e1", name: "Full-Time", is_active: true }, { id: "e2", name: "Contractor", is_active: true },
    { id: "e3", name: "Intern", is_active: true }, { id: "e4", name: "Part-Time", is_active: true },
  ],
  vendors: [
    { id: "v1", name: "Dell Qatar", is_active: true }, { id: "v2", name: "Redington Gulf", is_active: true },
  ],
};

export async function fetchLookup(table: LookupTable): Promise<LookupRow[]> {
  if (!isSupabaseConfigured) return MOCK[table];
  const { data, error } = await supabase.from(table).select("*").order("sort_order", { nullsFirst: true }).order("name");
  if (error) throw error;
  return data as LookupRow[];
}

export async function createLookupItem(table: LookupTable, input: Partial<LookupRow>) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from(table).insert(input).select().single();
  if (error) throw error;
  return data as LookupRow;
}

export async function toggleLookupActive(table: LookupTable, id: string, active: boolean) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from(table).update({ is_active: active }).eq("id", id);
  if (error) throw error;
}
