import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type License = {
  id: string;
  software_name: string;
  vendor_name?: string | null;
  license_type_name?: string | null;
  subscription_type_name?: string | null;
  company_name?: string;
  company_id: string;
  seats_purchased: number;
  seats_used: number;
  renewal_date: string | null;
  cost: number | null;
};

export type LicenseAssignment = { id: string; license_id: string; employee_id: string; employee_name?: string; assigned_at: string };

const MOCK_LICENSES: License[] = [
  { id: "sl1", software_name: "Microsoft 365 E3", vendor_name: "Microsoft", license_type_name: "Per User", subscription_type_name: "Annual", company_name: "Karawa", company_id: "karawa", seats_purchased: 50, seats_used: 38, renewal_date: "2027-02-01", cost: 21000 },
  { id: "sl2", software_name: "Adobe Creative Cloud", vendor_name: "Adobe", license_type_name: "Per Seat", subscription_type_name: "Annual", company_name: "Joy", company_id: "joy", seats_purchased: 8, seats_used: 8, renewal_date: "2026-09-15", cost: 9600 },
  { id: "sl3", software_name: "AutoCAD", vendor_name: "Autodesk", license_type_name: "Concurrent", subscription_type_name: "Annual", company_name: "JOT Events", company_id: "jot", seats_purchased: 3, seats_used: 1, renewal_date: "2026-08-10", cost: 5400 },
  { id: "sl4", software_name: "Windows Server CAL", vendor_name: "Microsoft", license_type_name: "Site License", subscription_type_name: "One-Time Perpetual", company_name: "Karawa", company_id: "karawa", seats_purchased: 25, seats_used: 25, renewal_date: null, cost: 4200 },
];
const MOCK_ASSIGNMENTS: Record<string, LicenseAssignment[]> = {
  sl1: [
    { id: "a1", license_id: "sl1", employee_id: "E-1001", employee_name: "Ahmed Al-Sayed", assigned_at: "2024-03-01" },
    { id: "a2", license_id: "sl1", employee_id: "E-1002", employee_name: "Fatima Nasser", assigned_at: "2024-03-01" },
  ],
  sl2: [{ id: "a3", license_id: "sl2", employee_id: "E-1007", employee_name: "Hamza Rahim", assigned_at: "2024-09-15" }],
};

export async function fetchLicenses(): Promise<License[]> {
  if (!isSupabaseConfigured) return MOCK_LICENSES;
  const { data, error } = await supabase
    .from("software_licenses")
    .select("id, software_name, seats_purchased, seats_used, renewal_date, cost, company_id, vendors(name), license_types(name), subscription_types(name), companies(name)")
    .order("software_name");
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id, software_name: r.software_name, vendor_name: r.vendors?.name, license_type_name: r.license_types?.name,
    subscription_type_name: r.subscription_types?.name, company_name: r.companies?.name, company_id: r.company_id,
    seats_purchased: r.seats_purchased, seats_used: r.seats_used, renewal_date: r.renewal_date, cost: r.cost,
  }));
}

export async function fetchAssignments(licenseId: string): Promise<LicenseAssignment[]> {
  if (!isSupabaseConfigured) return MOCK_ASSIGNMENTS[licenseId] ?? [];
  const { data, error } = await supabase
    .from("software_assignments")
    .select("id, license_id, employee_id, assigned_at, employees(first_name, last_name)")
    .eq("license_id", licenseId)
    .is("revoked_at", null);
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r, employee_name: r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : undefined }));
}

export async function createLicense(input: { software_name: string; company_id: string; seats_purchased: number; cost: number }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("software_licenses").insert({ ...input, seats_used: 0 }).select().single();
  if (error) throw error;
  return data;
}

export async function assignSeat(licenseId: string, employeeId: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error: assignError } = await supabase.from("software_assignments").insert({ license_id: licenseId, employee_id: employeeId });
  if (assignError) throw assignError;

  const { data: license, error: fetchError } = await supabase.from("software_licenses").select("seats_used").eq("id", licenseId).single();
  if (fetchError) throw fetchError;
  const { error: updateError } = await supabase.from("software_licenses").update({ seats_used: (license.seats_used ?? 0) + 1 }).eq("id", licenseId);
  if (updateError) throw updateError;
}

export async function revokeSeat(assignmentId: string, licenseId: string) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error: revokeError } = await supabase.from("software_assignments").update({ revoked_at: new Date().toISOString() }).eq("id", assignmentId);
  if (revokeError) throw revokeError;

  const { data: license, error: fetchError } = await supabase.from("software_licenses").select("seats_used").eq("id", licenseId).single();
  if (fetchError) throw fetchError;
  const { error: updateError } = await supabase.from("software_licenses").update({ seats_used: Math.max(0, (license.seats_used ?? 1) - 1) }).eq("id", licenseId);
  if (updateError) throw updateError;
}
