import { supabase, isSupabaseConfigured } from "../supabaseClient";

export type Role = { id: string; name: string; description: string | null; is_system_role: boolean };
export type Permission = { id: string; module: string; action: string };

const MODULES = ["dashboard", "employees", "hardware_assets", "software_licenses", "incidents", "reports", "settings"];
const ACTIONS = ["view", "add", "edit", "delete", "approve", "export", "print", "import"];

// Demo-mode data — mirrors the seed in db/schema.sql so the matrix looks
// the same whether or not a backend is connected.
const MOCK_ROLES: Role[] = [
  { id: "role-tech", name: "IT Technician", description: "Hardware-focused, read-only elsewhere", is_system_role: false },
  { id: "role-admin", name: "System Admin", description: "Full access", is_system_role: true },
];
const MOCK_GRANTED: Record<string, Set<string>> = {
  "role-tech": new Set(["dashboard:view", "employees:view", "hardware_assets:view", "hardware_assets:add", "hardware_assets:edit", "hardware_assets:export", "hardware_assets:print", "software_licenses:view", "incidents:view", "incidents:add", "incidents:edit", "reports:view", "reports:export"]),
  "role-admin": new Set(MODULES.flatMap((m) => ACTIONS.map((a) => `${m}:${a}`))),
};

export async function fetchRoles(): Promise<Role[]> {
  if (!isSupabaseConfigured) return MOCK_ROLES;
  const { data, error } = await supabase.from("roles").select("*").order("name");
  if (error) throw error;
  return data as Role[];
}

export async function fetchPermissions(): Promise<Permission[]> {
  if (!isSupabaseConfigured) {
    return MODULES.flatMap((m) => ACTIONS.map((a) => ({ id: `${m}:${a}`, module: m, action: a })));
  }
  const { data, error } = await supabase.from("permissions").select("*");
  if (error) throw error;
  return data as Permission[];
}

/** Returns the set of permission ids ("module:action" for demo mode, permission_id for live) granted to a role. */
export async function fetchGrantedPermissionIds(roleId: string): Promise<Set<string>> {
  if (!isSupabaseConfigured) {
    return MOCK_GRANTED[roleId] ?? new Set();
  }
  const { data, error } = await supabase.from("role_permissions").select("permission_id").eq("role_id", roleId);
  if (error) throw error;
  return new Set((data as { permission_id: string }[]).map((r) => r.permission_id));
}

export async function setPermission(roleId: string, permissionId: string, granted: boolean) {
  if (!isSupabaseConfigured) {
    throw new Error("Connect a Supabase project (see .env.example) before writing data.");
  }
  if (granted) {
    const { error } = await supabase.from("role_permissions").upsert({ role_id: roleId, permission_id: permissionId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", permissionId);
    if (error) throw error;
  }
}

export async function createRole(name: string, description: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Connect a Supabase project (see .env.example) before writing data.");
  }
  const { data, error } = await supabase.from("roles").insert({ name, description }).select().single();
  if (error) throw error;
  return data as Role;
}
