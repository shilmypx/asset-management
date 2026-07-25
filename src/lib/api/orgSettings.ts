import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type Department = { id: string; name: string; code: string; is_shared: boolean };
export type Location = { id: string; company_id: string; name: string; type: string | null; address: string | null };
export type CostCenter = { id: string; company_id: string; name: string; code: string };

const MOCK_DEPARTMENTS: Department[] = [
  { id: "d1", name: "IT", code: "IT", is_shared: true },
  { id: "d2", name: "HR", code: "HR", is_shared: true },
  { id: "d3", name: "Finance", code: "FIN", is_shared: true },
];
const MOCK_LOCATIONS: Location[] = [
  { id: "loc1", company_id: "karawa", name: "Doha HQ · IT Floor", type: "office", address: null },
  { id: "loc2", company_id: "o2cafe", name: "O2 Café · Branch 02", type: "branch", address: null },
];
const MOCK_COST_CENTERS: CostCenter[] = [
  { id: "cc1", company_id: "karawa", name: "IT Operations", code: "CC-100" },
];

export async function fetchDepartments(): Promise<Department[]> {
  if (!isSupabaseConfigured) return MOCK_DEPARTMENTS;
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw error;
  return data as Department[];
}
export async function createDepartment(input: Omit<Department, "id">) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("departments").insert(input).select().single();
  if (error) throw error;
  return data as Department;
}

export async function fetchLocations(companyId: string): Promise<Location[]> {
  if (!isSupabaseConfigured) return MOCK_LOCATIONS.filter((l) => l.company_id === companyId);
  const { data, error } = await supabase.from("locations").select("*").eq("company_id", companyId).order("name");
  if (error) throw error;
  return data as Location[];
}
export async function createLocation(input: Omit<Location, "id">) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("locations").insert(input).select().single();
  if (error) throw error;
  return data as Location;
}

export async function fetchCostCenters(companyId: string): Promise<CostCenter[]> {
  if (!isSupabaseConfigured) return MOCK_COST_CENTERS.filter((c) => c.company_id === companyId);
  const { data, error } = await supabase.from("cost_centers").select("*").eq("company_id", companyId).order("name");
  if (error) throw error;
  return data as CostCenter[];
}
export async function createCostCenter(input: Omit<CostCenter, "id">) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("cost_centers").insert(input).select().single();
  if (error) throw error;
  return data as CostCenter;
}
