import { supabase, isSupabaseConfigured } from "../supabaseClient";

// NOTE on auth: this file intentionally never touches password_hash.
// Credentials belong in Supabase's built-in `auth.users` (secure hashing,
// MFA, sessions, all handled server-side) — this table is app-level data
// (role assignment, employee link, lock status) keyed to that auth user's
// id. Inviting a user / setting a password requires the Supabase service
// role key, which must run server-side (an Edge Function), never in the
// browser with the anon key — so "Add user" here creates the app-side
// profile row only; the invite email is a separate step documented in the
// README rather than faked here.

export type UserRow = {
  id: string;
  username: string;
  email: string;
  employee_name: string | null;
  is_locked: boolean;
  status: string;
  last_login_at: string | null;
  role_names: string[];
};

const MOCK_USERS: UserRow[] = [
  { id: "u1", username: "ahmed.alsayed", email: "ahmed.alsayed@karawa.qa", employee_name: "Ahmed Al-Sayed", is_locked: false, status: "active", last_login_at: "2026-07-24", role_names: ["IT Technician"] },
  { id: "u2", username: "fatima.nasser", email: "fatima.nasser@karawa.qa", employee_name: "Fatima Nasser", is_locked: false, status: "active", last_login_at: "2026-07-20", role_names: ["System Admin"] },
  { id: "u3", username: "omar.zayed", email: "omar.zayed@o2cafe.qa", employee_name: "Omar Zayed", is_locked: true, status: "active", last_login_at: "2026-06-02", role_names: [] },
];

export async function fetchUsers(): Promise<UserRow[]> {
  if (!isSupabaseConfigured) return MOCK_USERS;

  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, is_locked, status, last_login_at, employees(first_name, last_name), user_roles(roles(name))")
    .order("username");
  if (error) throw error;

  return (data as any[]).map((r) => ({
    id: r.id,
    username: r.username,
    email: r.email,
    employee_name: r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : null,
    is_locked: r.is_locked,
    status: r.status,
    last_login_at: r.last_login_at,
    role_names: (r.user_roles ?? []).map((ur: any) => ur.roles?.name).filter(Boolean),
  }));
}

export async function toggleLock(userId: string, lock: boolean) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from("users").update({ is_locked: lock }).eq("id", userId);
  if (error) throw error;
}

export async function assignRole(userId: string, roleId: string, companyId: string | null) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role_id: roleId, company_id: companyId });
  if (error) throw error;
}

/** Creates the app-level profile row only — no credentials. See file header. */
export async function createUserProfile(input: { employee_id: string; username: string; email: string }) {
  if (!isSupabaseConfigured) throw new Error("Connect a Supabase project before writing data.");
  const { data, error } = await supabase.from("users").insert({ ...input, status: "pending_invite" }).select().single();
  if (error) throw error;
  return data;
}
