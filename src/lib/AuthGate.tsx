import React, { createContext, useContext } from "react";
import { useAuthSession, SessionProfile } from "./auth";
import Login from "../pages/Login";

type AuthContextValue = {
  profile: SessionProfile | null;
  signOut: () => Promise<void>;
  isSupabaseConfigured: boolean;
  /**
   * Real permission check — returns true if the signed-in user's role(s)
   * grant `action` on `module`, or if any of their roles is a system role
   * (full access, same bypass RLS gives system roles at the DB layer).
   * In demo mode (no backend), always returns true — there's no real
   * user/role to check against, so gating on it would just make the
   * demo unusable rather than model anything real.
   */
  can: (module: string, action: string) => boolean;
};

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  signOut: async () => {},
  isSupabaseConfigured: false,
  can: () => true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, profile, signIn, signOut, isSupabaseConfigured } = useAuthSession();

  function can(module: string, action: string) {
    if (!isSupabaseConfigured) return true; // demo mode — nothing to check against
    if (!profile) return false;
    if (profile.isSystemAdmin) return true;
    return profile.permissions.has(`${module}:${action}`);
  }

  if (!isSupabaseConfigured) {
    // Demo mode: no backend to authenticate against, so skip straight to the app.
    return <AuthContext.Provider value={{ profile: null, signOut, isSupabaseConfigured, can }}>{children}</AuthContext.Provider>;
  }

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#F5F6F8] text-sm text-slate-400">Loading…</div>;
  }

  if (!profile) {
    return <Login onSignIn={signIn} />;
  }

  return <AuthContext.Provider value={{ profile, signOut, isSupabaseConfigured, can }}>{children}</AuthContext.Provider>;
}
