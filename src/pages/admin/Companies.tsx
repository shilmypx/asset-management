import React, { useEffect, useState } from "react";
import { Plus, Database, CircleDot } from "lucide-react";
import { fetchCompanies, createCompany, CompanyRow } from "../../lib/api/org";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

export default function CompaniesAdmin() {
  const [companies, setCompanies] = useState<CompanyRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isParent, setIsParent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => fetchCompanies().then(setCompanies);
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createCompany({ name, code, is_parent: isParent });
      setName(""); setCode(""); setIsParent(false); setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-slate-700">Companies</h2>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
          )}
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40"
          disabled={!isSupabaseConfigured}
          title={!isSupabaseConfigured ? "Connect Supabase to add companies" : ""}
        >
          <Plus size={14} /> Add company
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Code</label>
            <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-24" />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-600 pb-2">
            <input type="checkbox" checked={isParent} onChange={(e) => setIsParent(e.target.checked)} /> Parent company
          </label>
          <button disabled={saving} className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">
            {saving ? "Saving…" : "Save"}
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Code</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies === null && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {companies?.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                <td className="px-5 py-3 text-slate-500">{c.code}</td>
                <td className="px-5 py-3 text-slate-600">{c.is_parent ? "Parent" : "Sister company"}</td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
