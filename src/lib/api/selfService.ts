import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type RequestType = "new_hardware" | "software_license" | "upgrade" | "repair";
export type RequestStatus = "submitted" | "approved" | "rejected" | "fulfilled";

export type AssetRequest = {
  id: string;
  employee_id: string;
  employee_name?: string;
  request_type: RequestType;
  category_name?: string | null;
  justification: string;
  status: RequestStatus;
  requested_at: string;
};

let mockRequests: AssetRequest[] = [
  { id: "r1", employee_id: "E-1006", employee_name: "Noor Kassem", request_type: "new_hardware", category_name: "Laptop", justification: "Current laptop is 5 years old and struggling with design tools.", status: "submitted", requested_at: "2026-07-22" },
  { id: "r2", employee_id: "E-1001", employee_name: "Ahmed Al-Sayed", request_type: "software_license", category_name: null, justification: "Need a second monitor license for remote diagnostics tool.", status: "approved", requested_at: "2026-07-15" },
];

export async function fetchMyRequests(employeeId: string): Promise<AssetRequest[]> {
  if (!isSupabaseConfigured) return mockRequests.filter((r) => r.employee_id === employeeId);
  const { data, error } = await supabase
    .from("asset_requests")
    .select("id, employee_id, request_type, justification, status, requested_at, asset_categories(name)")
    .eq("employee_id", employeeId)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r, category_name: r.asset_categories?.name ?? null }));
}

export async function fetchAllRequests(): Promise<AssetRequest[]> {
  if (!isSupabaseConfigured) return mockRequests;
  const { data, error } = await supabase
    .from("asset_requests")
    .select("id, employee_id, request_type, justification, status, requested_at, asset_categories(name), employees(first_name, last_name)")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({
    ...r,
    category_name: r.asset_categories?.name ?? null,
    employee_name: r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : undefined,
  }));
}

export async function submitRequest(input: { employee_id: string; request_type: RequestType; category_id: string | null; justification: string }) {
  if (!isSupabaseConfigured) {
    mockRequests = [{ id: `r${Date.now()}`, ...input, status: "submitted", requested_at: new Date().toISOString().slice(0, 10) }, ...mockRequests];
    return;
  }
  const { error } = await supabase.from("asset_requests").insert(input);
  if (error) throw error;
}

export async function decideRequest(id: string, status: "approved" | "rejected") {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from("asset_requests").update({ status }).eq("id", id);
  if (error) throw error;
}
