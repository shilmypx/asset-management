import React, { useState } from "react";
import { LogIn } from "lucide-react";

export default function Login({ onSignIn }: { onSignIn: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSignIn(email, password);
    } catch (err: any) {
      setError(err.message ?? "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#F5F6F8]">
      <div className="w-[360px] bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-md flex items-center justify-center font-bold text-sm bg-accent text-[#062E29]">IT</div>
          <div>
            <div className="text-sm font-semibold text-slate-900 leading-tight">ITAMS</div>
            <div className="text-xs text-slate-400 leading-tight">Karawa Group</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@karawa.qa" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          {error && <div className="text-xs text-red-500">{error}</div>}
          <button disabled={loading} className="w-full flex items-center justify-center gap-1.5 bg-accent text-white text-sm py-2 rounded-md disabled:opacity-50">
            <LogIn size={14} /> {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="text-xs text-slate-400 mt-4 text-center">
          Accounts are managed via Supabase Auth — ask your admin for an invite if you don't have one yet.
        </div>
      </div>
    </div>
  );
}
