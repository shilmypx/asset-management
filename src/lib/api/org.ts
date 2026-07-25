import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { ORG, OrgNode } from "../mockData";

// This file is the template for every other module's data layer:
// try Supabase first when configured, fall back to in-memory mock data
// otherwise, so the app runs standalone before a backend is wired up
// and switches to live data the moment VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY are set (see .env.example).

export type CompanyRow = {
  id: string;
  name: string;
  code: string;
  is_parent: boolean;
  parent_company_id: string | null;
  status: string;
};

export type OrgUnitRow = {
  id: string;
  company_id: string;
  parent_org_unit_id: string | null;
  name: string;
  type: "branch" | "business_unit" | "division";
  sort_order: number;
  status: string;
};

export async function fetchCompanies(): Promise<CompanyRow[]> {
  if (!isSupabaseConfigured) {
    return ORG.map((c, i) => ({
      id: c.id,
      name: c.name,
      code: c.id.toUpperCase(),
      is_parent: c.id === "karawa",
      parent_company_id: null,
      status: "active",
    }));
  }
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw error;
  return data as CompanyRow[];
}

export async function fetchOrgUnits(companyId: string): Promise<OrgUnitRow[]> {
  if (!isSupabaseConfigured) {
    const company = ORG.find((c) => c.id === companyId);
    if (!company?.children) return [];
    const flat: OrgUnitRow[] = [];
    const walk = (nodes: OrgNode[], parentId: string | null) => {
      nodes.forEach((n, i) => {
        flat.push({
          id: n.id,
          company_id: companyId,
          parent_org_unit_id: parentId,
          name: n.name,
          type: (n.type || "branch") as OrgUnitRow["type"],
          sort_order: i,
          status: "active",
        });
        if (n.children) walk(n.children, n.id);
      });
    };
    walk(company.children, null);
    return flat;
  }
  const { data, error } = await supabase
    .from("org_units")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order");
  if (error) throw error;
  return data as OrgUnitRow[];
}

export async function createCompany(input: Pick<CompanyRow, "name" | "code" | "is_parent">) {
  if (!isSupabaseConfigured) {
    throw new Error("Connect a Supabase project (see .env.example) before writing data.");
  }
  const { data, error } = await supabase.from("companies").insert(input).select().single();
  if (error) throw error;
  return data as CompanyRow;
}

export async function createOrgUnit(input: Omit<OrgUnitRow, "id">) {
  if (!isSupabaseConfigured) {
    throw new Error("Connect a Supabase project (see .env.example) before writing data.");
  }
  const { data, error } = await supabase.from("org_units").insert(input).select().single();
  if (error) throw error;
  return data as OrgUnitRow;
}

export async function updateOrgUnit(id: string, changes: Partial<OrgUnitRow>) {
  if (!isSupabaseConfigured) {
    throw new Error("Connect a Supabase project (see .env.example) before writing data.");
  }
  const { data, error } = await supabase.from("org_units").update(changes).eq("id", id).select().single();
  if (error) throw error;
  return data as OrgUnitRow;
}

export async function deactivateOrgUnit(id: string) {
  return updateOrgUnit(id, { status: "inactive" });
}
