import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthGate";
import { Plus, Database, CircleDot } from "lucide-react";
import { fetchLookup, createLookupItem, toggleLookupActive, LookupTable, LookupRow } from "../../lib/api/lookups";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

const TABLES: { value: LookupTable; label: string; hasCode?: boolean; hasDepreciationFlag?: boolean }[] = [
  { value: "asset_categories", label: "Asset Categories", hasDepreciationFlag: true },
  { value: "manufacturers", label: "Manufacturers" },
  { value: "asset_statuses", label: "Asset Statuses" },
  { value: "license_types", label: "License Types" },
  { value: "subscription_types", label: "Subscription Types" },
  { value: "currencies", label: "Currencies", hasCode: true },
  { value: "employment_types", label: "Employment Types" },
  { value: "vendors", label: "Vendors" },
];

export default function MasterDataAdmin() {
  const { can } = useAuth();
  const [table, setTable] = useState<LookupTable>("asset_categories");
  const [rows, setRows] = useState<LookupRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [allowDep, setAllowDep] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = TABLES.find((t) => t.value === table)!;
  const load = () => fetchLookup(table).then(setRows);

  useEffect(() => { load(); setShowAdd(false); }, [table]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const input: Partial<LookupRow> = { name };
      if (config.hasCode) input.code = code;
      if (config.hasDepreciationFlag) input.allow_depreciation = allowDep;
      await createLookupItem(table, input);
      setName(""); setCode(""); setAllowDep(true); setShowAdd(false);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    }
  }

  async function handleToggle(row: LookupRow) {
    try {
      await toggleLookupActive(table, row.id, !(row.is_active ?? true));
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to update.");
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select value={table} onChange={(e) => setTable(e.target.value as LookupTable)} className="text-sm border border-slate-200 rounded-md px-3 py-1.5">
            {TABLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
          )}
        </div>
        <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured || !can("settings", "add")} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Plus size={14} /> Add {config.label.replace(/s$/, "")}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          {config.hasCode && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Code</label>
              <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-20" />
            </div>
          )}
          {config.hasDepreciationFlag && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600 pb-2">
              <input type="checkbox" checked={allowDep} onChange={(e) => setAllowDep(e.target.checked)} /> Allow depreciation
            </label>
          )}
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Name</th>
              {config.hasCode && <th className="px-5 py-3 font-medium">Code</th>}
              {config.hasDepreciationFlag && <th className="px-5 py-3 font-medium">Depreciable</th>}
              <th className="px-5 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-800">{r.name}</td>
                {config.hasCode && <td className="px-5 py-3 text-slate-500">{r.code}</td>}
                {config.hasDepreciationFlag && <td className="px-5 py-3 text-slate-500">{r.allow_depreciation ? "Yes" : "No"}</td>}
                <td className="px-5 py-3">
                  <button onClick={() => handleToggle(r)} disabled={!isSupabaseConfigured || !can("settings", "edit")} className="disabled:opacity-40">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
