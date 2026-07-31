import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthGate";
import { Plus, Database, CircleDot, Edit2 } from "lucide-react";
import { fetchCompanies, fetchOrgUnits, createOrgUnit, updateOrgUnit, deactivateOrgUnit, CompanyRow, OrgUnitRow } from "../../lib/api/org";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

type FlatRow = OrgUnitRow & { depth: number };

function flatten(units: OrgUnitRow[]): FlatRow[] {
  const byParent: Record<string, OrgUnitRow[]> = {};
  units.forEach((u) => {
    const key = u.parent_org_unit_id ?? "root";
    (byParent[key] ??= []).push(u);
  });
  const out: FlatRow[] = [];
  const walk = (parentKey: string, depth: number) => {
    (byParent[parentKey] ?? []).sort((a, b) => a.sort_order - b.sort_order).forEach((u) => {
      out.push({ ...u, depth });
      walk(u.id, depth + 1);
    });
  };
  walk("root", 0);
  return out;
}

export default function OrgUnitsAdmin() {
  const { can } = useAuth();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [units, setUnits] = useState<OrgUnitRow[] | null>(null);
  const [editing, setEditing] = useState<OrgUnitRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<OrgUnitRow["type"]>("branch");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies().then((cs) => {
      setCompanies(cs);
      if (cs.length) setCompanyId(cs[0].id);
    });
  }, []);

  const load = (cid: string) => fetchOrgUnits(cid).then(setUnits);
  useEffect(() => {
    if (companyId) load(companyId);
  }, [companyId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createOrgUnit({ company_id: companyId, parent_org_unit_id: null, name, type, sort_order: (units?.length ?? 0), status: "active" });
      setName(""); setShowAdd(false);
      await load(companyId);
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    try {
      await updateOrgUnit(editing.id, { name: editing.name, type: editing.type, status: editing.status });
      setEditing(null);
      await load(companyId);
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    }
  }

  const rows = flatten(units ?? []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="text-sm border border-slate-200 rounded-md px-3 py-1.5">
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data — read-only until Supabase is connected</span>
          )}
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          disabled={!isSupabaseConfigured || !can("settings", "add")}
          className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40"
        >
          <Plus size={14} /> Add org unit
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as OrgUnitRow["type"])} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              <option value="branch">Branch</option>
              <option value="business_unit">Business unit</option>
              <option value="division">Division</option>
            </select>
          </div>
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </form>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {units === null && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2" style={{ paddingLeft: 16 + u.depth * 18 }}>{u.name}</td>
                  <td className="px-4 py-2 text-slate-500">{u.type.replace("_", " ")}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEditing(u)} disabled={!isSupabaseConfigured || !can("settings", "edit")} className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {units !== null && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No org units for this company yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          {!editing && <div className="text-xs text-slate-400">Select the edit icon on a row to rename, retype, or deactivate it.</div>}
          {editing && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">Edit org unit</div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Name</label>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Type</label>
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as OrgUnitRow["type"] })} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-full">
                  <option value="branch">Branch</option>
                  <option value="business_unit">Business unit</option>
                  <option value="division">Division</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-full">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveEdit} className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
                <button onClick={() => setEditing(null)} className="text-sm text-slate-500 px-3 py-1.5">Cancel</button>
              </div>
              {error && <div className="text-xs text-red-500">{error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
