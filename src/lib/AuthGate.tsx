import React, { createContext, useContext } from "react";
import { useAuthSession, SessionProfile } from "./auth";
import Login from "../pages/Login";

type AuthContextValue = { profile: SessionProfile | null; signOut: () => Promise<void>; isSupabaseConfigured: boolean };
const AuthContext = createContext<AuthContextValue>({ profile: null, signOut: async () => {}, isSupabaseConfigured: false });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, profile, signIn, signOut, isSupabaseConfigured } = useAuthSession();

  if (!isSupabaseConfigured) {
    // Demo mode: no backend to authenticate against, so skip straight to the app.
    return <AuthContext.Provider value={{ profile: null, signOut, isSupabaseConfigured }}>{children}</AuthContext.Provider>;
  }

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#F5F6F8] text-sm text-slate-400">Loading…</div>;
  }

  if (!profile) {
    return <Login onSignIn={signIn} />;
  }

  return <AuthContext.Provider value={{ profile, signOut, isSupabaseConfigured }}>{children}</AuthContext.Provider>;
}
