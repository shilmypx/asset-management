import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export type SessionProfile = {
  authUserId: string;
  email: string;
  appUserId: string | null;
  employeeId: string | null;
  employeeName: string | null;
  roleNames: string[];
};

export function useAuthSession() {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profile, setProfile] = useState<SessionProfile | null>(null);

  async function loadProfile(authUserId: string, email: string) {
    // The auth.users row (Supabase-managed) is linked to our app-level
    // `users` row by matching email — see README for why credentials and
    // app data are split like this.
    const { data, error } = await supabase
      .from("users")
      .select("id, employee_id, employees(first_name, last_name), user_roles(roles(name))")
      .eq("email", email)
      .maybeSingle();
    if (error || !data) {
      setProfile({ authUserId, email, appUserId: null, employeeId: null, employeeName: null, roleNames: [] });
      return;
    }
    setProfile({
      authUserId,
      email,
      appUserId: data.id,
      employeeId: data.employee_id,
      employeeName: (data as any).employees ? `${(data as any).employees.first_name} ${(data as any).employees.last_name}` : null,
      roleNames: ((data as any).user_roles ?? []).map((ur: any) => ur.roles?.name).filter(Boolean),
    });
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session?.user) loadProfile(session.user.id, session.user.email!);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id, session.user.email!);
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { loading, profile, signIn, signOut, isSupabaseConfigured };
}
