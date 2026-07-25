import React, { useEffect, useState } from "react";
import { Plus, Database, CircleDot } from "lucide-react";
import { fetchCompanies, CompanyRow } from "../../lib/api/org";
import { fetchDepartments, createDepartment, fetchLocations, createLocation, fetchCostCenters, createCostCenter, Department, Location, CostCenter } from "../../lib/api/orgSettings";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

type Tab = "departments" | "locations" | "cost_centers";

export default function OrgSettings() {
  const [tab, setTab] = useState<Tab>("departments");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [costCenters, setCostCenters] = useState<CostCenter[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies().then((cs) => { setCompanies(cs); if (cs.length) setCompanyId(cs[0].id); });
    fetchDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    if (tab === "locations") fetchLocations(companyId).then(setLocations);
    if (tab === "cost_centers") fetchCostCenters(companyId).then(setCostCenters);
  }, [tab, companyId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (tab === "departments") {
        await createDepartment({ name, code, is_shared: isShared });
        await fetchDepartments().then(setDepartments);
      } else if (tab === "locations") {
        await createLocation({ company_id: companyId, name, type: null, address: null });
        await fetchLocations(companyId).then(setLocations);
      } else {
        await createCostCenter({ company_id: companyId, name, code });
        await fetchCostCenters(companyId).then(setCostCenters);
      }
      setName(""); setCode(""); setIsShared(false); setShowAdd(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "departments", label: "Departments" },
    { id: "locations", label: "Locations" },
    { id: "cost_centers", label: "Cost Centers" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setShowAdd(false); }}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === t.id ? "border-accent text-accent-dark font-medium" : "border-transparent text-slate-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {tab !== "departments" && (
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="text-sm border border-slate-200 rounded-md px-3 py-1.5">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 text-xs text-accent-dark"><Database size={12} /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><CircleDot size={12} /> Demo data</span>
          )}
        </div>
        <button onClick={() => setShowAdd((s) => !s)} disabled={!isSupabaseConfigured} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
          <Plus size={14} /> Add
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
          </div>
          {tab !== "locations" && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Code</label>
              <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm w-24" />
            </div>
          )}
          {tab === "departments" && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600 pb-2">
              <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} /> Shared across companies
            </label>
          )}
          <button className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md">Save</button>
        </form>
      )}
      {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

      {tab === "departments" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Code</th><th className="px-5 py-3 font-medium">Shared</th>
            </tr></thead>
            <tbody>
              {departments === null && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
              {departments?.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{d.name}</td>
                  <td className="px-5 py-3 text-slate-500">{d.code}</td>
                  <td className="px-5 py-3 text-slate-500">{d.is_shared ? "Yes — all companies" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "locations" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Type</th>
            </tr></thead>
            <tbody>
              {locations === null && <tr><td colSpan={2} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
              {locations?.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{l.name}</td>
                  <td className="px-5 py-3 text-slate-500">{l.type ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "cost_centers" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Code</th>
            </tr></thead>
            <tbody>
              {costCenters === null && <tr><td colSpan={2} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
              {costCenters?.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-5 py-3 text-slate-500">{c.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
