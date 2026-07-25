import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type LookupRow = {
  id: string;
  name: string;
  code?: string | null;
  sort_order?: number;
  is_active?: boolean;
  allow_depreciation?: boolean; // asset_categories only
};

export type LookupTable =
  | "departments"
  | "cost_centers"
  | "asset_categories"
  | "manufacturers"
  | "vendors"
  | "asset_statuses"
  | "license_types"
  | "subscription_types"
  | "currencies"
  | "employment_types";

// Demo-mode data, one small set per table so the screen has something to show.
const MOCK: Record<LookupTable, LookupRow[]> = {
  departments: [
    { id: "d1", name: "IT", code: "IT", is_active: true },
    { id: "d2", name: "HR", code: "HR", is_active: true },
    { id: "d3", name: "Finance", code: "FIN", is_active: true },
  ],
  cost_centers: [
    { id: "cc1", name: "IT Operations", code: "CC-100", is_active: true },
    { id: "cc2", name: "Branch Operations", code: "CC-200", is_active: true },
  ],
  asset_categories: [
    { id: "cat1", name: "Laptop", allow_depreciation: true, is_active: true },
    { id: "cat2", name: "Desktop", allow_depreciation: true, is_active: true },
    { id: "cat3", name: "Mouse", allow_depreciation: false, is_active: true },
    { id: "cat4", name: "Keyboard", allow_depreciation: false, is_active: true },
    { id: "cat5", name: "Bundle", allow_depreciation: true, is_active: true },
  ],
  manufacturers: [
    { id: "m1", name: "Dell", is_active: true },
    { id: "m2", name: "Apple", is_active: true },
    { id: "m3", name: "HP", is_active: true },
    { id: "m4", name: "Cisco", is_active: true },
  ],
  vendors: [
    { id: "v1", name: "Dell Qatar", is_active: true },
    { id: "v2", name: "Ooredoo Business", is_active: true },
  ],
  asset_statuses: [
    { id: "s1", name: "Available", is_active: true },
    { id: "s2", name: "Assigned", is_active: true },
    { id: "s3", name: "Under Repair", is_active: true },
    { id: "s4", name: "Disposed", is_active: true },
  ],
  license_types: [
    { id: "lt1", name: "Per User", is_active: true },
    { id: "lt2", name: "Per Seat", is_active: true },
    { id: "lt3", name: "Concurrent", is_active: true },
    { id: "lt4", name: "Site License", is_active: true },
  ],
  subscription_types: [
    { id: "st1", name: "Monthly", is_active: true },
    { id: "st2", name: "Annual", is_active: true },
    { id: "st3", name: "One-Time Perpetual", is_active: true },
  ],
  currencies: [
    { id: "c1", name: "Qatari Riyal", code: "QAR", is_active: true },
    { id: "c2", name: "US Dollar", code: "USD", is_active: true },
  ],
  employment_types: [
    { id: "et1", name: "Full-Time", is_active: true },
    { id: "et2", name: "Contractor", is_active: true },
    { id: "et3", name: "Intern", is_active: true },
    { id: "et4", name: "Part-Time", is_active: true },
  ],
};

export const LOOKUP_LABELS: Record<LookupTable, string> = {
  departments: "Departments",
  cost_centers: "Cost Centers",
  asset_categories: "Asset Categories",
  manufacturers: "Manufacturers",
  vendors: "Vendors",
  asset_statuses: "Asset Statuses",
  license_types: "License Types",
  subscription_types: "Subscription Types",
  currencies: "Currencies",
  employment_types: "Employment Types",
};

export async function fetchLookup(table: LookupTable): Promise<LookupRow[]> {
  if (!isSupabaseConfigured) return MOCK[table];
  const { data, error } = await supabase.from(table).select("*").order("name");
  if (error) throw error;
  return data as LookupRow[];
}

export async function createLookupRow(table: LookupTable, row: Partial<LookupRow>) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data as LookupRow;
}

export async function toggleActive(table: LookupTable, id: string, active: boolean) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from(table).update({ is_active: active }).eq("id", id);
  if (error) throw error;
}
